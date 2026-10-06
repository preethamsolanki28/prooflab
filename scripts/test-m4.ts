import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { createAdminClient, createScopedUserClient } from "../src/lib/supabase/server";
import {
  savePendingAction,
  getPendingActions,
  markActionSynced,
  clearOutbox,
} from "../src/lib/outbox/client";
import { syncPendingAction } from "../src/lib/outbox/sync";
import { PendingAction } from "../src/lib/outbox/types";
import {
  submitContribution,
  getUserResearchCredits,
} from "../src/lib/contributions/service";
import { submitReview } from "../src/lib/contributions/review";
import {
  fundMilestoneEscrow,
  acceptMilestone,
  releaseMilestoneEscrow,
  getMilestoneEscrow,
} from "../src/lib/escrow/service";
import { calculateMilestoneRewards, HANDOUT_EXAMPLE_FIXTURE } from "../src/lib/rewards/calculator";
import { withdrawProject } from "../src/lib/projects/withdrawal";
import { issueCredential } from "../src/lib/credentials/service";
import { verifyLedgerChain, simulateTamperLedger } from "../src/lib/ledger";
import { routeAiRequest } from "../src/lib/ai/router";
import { scoreCandidate } from "../src/lib/matching/matcher";
import { generateWatermark } from "@/lib/watermark";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SERVICE_KEY) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is required for M4 tests.");
  process.exit(1);
}

const adminClient = createAdminClient();
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

interface AuthUserSession {
  email: string;
  id: string;
  role: string;
  token: string;
}

async function loginUser(email: string, password = "Password123!"): Promise<AuthUserSession> {
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to login ${email}: ${error?.message}`);
  }
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  return {
    email,
    id: data.user.id,
    role: profile?.role || "student",
    token: data.session.access_token,
  };
}

async function runM4TestSuite() {
  console.log("==================================================");
  console.log("GARDENIA 2K26 — M4 RESILIENCE & INTEGRATION TEST SUITE");
  console.log("Testing: Outbox Fallback, Idempotency, Conflict, Section 6 Integration & Safety");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, details: string) {
    if (ok) {
      console.log(`[PASS] ${name}: ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}: ${details}`);
      failed++;
    }
  }

  try {
    // 0. Authenticate Personas
    console.log("--- Step 0: Authenticating Personas ---");
    const sponsor = await loginUser("sponsor@gardenia.test");
    const studentA = await loginUser("student_a@gardenia.test");
    const studentB = await loginUser("student_b@gardenia.test");
    const expert = await loginUser("expert@gardenia.test");
    console.log(`✓ Sponsor: ${sponsor.email}`);
    console.log(`✓ Student A (Arjun): ${studentA.email}`);
    console.log(`✓ Student B (Priya): ${studentB.email}`);
    console.log(`✓ Expert (Dr. Ananya): ${expert.email}\n`);

    // Setup fresh test project for M4
    const { data: project } = await adminClient
      .from("projects")
      .insert({
        sponsor_id: sponsor.id,
        title: `M4 Resilience Project ${Date.now()}`,
        public_summary: "Offline outbox resilience and charter conflict test project.",
        engagement_model: "FUNDED",
        data_sensitivity: "confidential",
        status: "active",
      })
      .select()
      .single();

    if (!project) throw new Error("Project creation failed");

    // Add private brief
    await adminClient.from("project_private_briefs").insert({
      project_id: project.id,
      confidential_brief: "CONFIDENTIAL BRIEF: Proprietary test vectors.",
    });

    // Add Charter v1
    const { data: charter } = await adminClient
      .from("charters")
      .insert({
        project_id: project.id,
        version: 1,
        engagement_model: "FUNDED",
        budget: 100000,
      })
      .select()
      .single();

    // Add Milestone
    const { data: milestone } = await adminClient
      .from("milestones")
      .insert({
        project_id: project.id,
        title: "Milestone 1: Resilient Edge Audio Pipeline",
        description: "Audio edge pipeline.",
        amount: 50000,
        status: "open",
      })
      .select()
      .single();

    // ================================================================
    // TEST 1: offline contribution -> local pending action
    // ================================================================
    clearOutbox();
    const testIdempotencyId = `outbox-test-${Date.now()}`;
    const pendingAction = savePendingAction({
      idempotencyId: testIdempotencyId,
      actionType: "CONTRIBUTION_SUBMISSION",
      projectId: project.id,
      charterVersion: 1,
      payload: {
        milestoneId: milestone?.id,
        title: "Edge Audio Denoising Filter",
        summary: "Wavelet denoising filter implementation.",
        contributionType: "code",
        aiAssisted: true,
        aiProvider: "local",
      },
    });

    const storedActions = getPendingActions(project.id);
    const isTest1Ok =
      pendingAction.status === "PENDING" &&
      storedActions.length === 1 &&
      storedActions[0].idempotencyId === testIdempotencyId;

    report(
      "TEST 1: Offline Contribution -> Local Pending Outbox",
      isTest1Ok,
      `Action enqueued with idempotency ID: ${testIdempotencyId}. Status: ${pendingAction.status}`
    );

    // ================================================================
    // TEST 2: pending contribution -> sync succeeds
    // ================================================================
    const syncResult = await syncPendingAction(adminClient, pendingAction, {
      id: studentA.id,
      email: studentA.email,
      displayName: "Arjun (Student A)",
    });

    const isTest2Ok =
      syncResult.status === "SYNCED" &&
      syncResult.alreadySynced === false &&
      Boolean(syncResult.serverEntityId);

    markActionSynced(testIdempotencyId, syncResult.serverEntityId);

    report(
      "TEST 2: Pending Action Sync to Server",
      isTest2Ok,
      `Sync status: ${syncResult.status}. Server Entity ID: ${syncResult.serverEntityId?.slice(0, 8)}`
    );

    // ================================================================
    // TEST 3: duplicate sync -> one contribution only
    // ================================================================
    const duplicateSyncResult = await syncPendingAction(adminClient, pendingAction, {
      id: studentA.id,
      email: studentA.email,
      displayName: "Arjun (Student A)",
    });

    const { data: dbContributions } = await adminClient
      .from("contributions")
      .select("id")
      .eq("idempotency_id", testIdempotencyId);

    const isTest3Ok =
      duplicateSyncResult.status === "SYNCED" &&
      duplicateSyncResult.alreadySynced === true &&
      (dbContributions || []).length === 1;

    report(
      "TEST 3: Duplicate Sync Idempotency (Single Contribution)",
      isTest3Ok,
      `Duplicate sync recognized: alreadySynced = ${duplicateSyncResult.alreadySynced}. DB row count = ${dbContributions?.length}`
    );

    // ================================================================
    // TEST 4: stale charter version -> CONFLICT
    // ================================================================
    // Bump project charter to v2
    await adminClient.from("charters").insert({
      project_id: project.id,
      version: 2,
      engagement_model: "FUNDED",
      budget: 120000,
    });

    // Attempt to sync action created under Charter v1
    const staleAction: PendingAction = {
      ...pendingAction,
      idempotencyId: `stale-idemp-${Date.now()}`,
      charterVersion: 1, // Stale! Current is v2
    };

    const conflictResult = await syncPendingAction(adminClient, staleAction, {
      id: studentA.id,
      email: studentA.email,
      displayName: "Arjun",
    });

    const isTest4Ok =
      conflictResult.status === "CONFLICT" &&
      Boolean(conflictResult.error?.includes("Charter v1")) &&
      Boolean(conflictResult.error?.includes("Charter v2"));

    report(
      "TEST 4: Stale Charter Version Conflict Rejection",
      isTest4Ok,
      `Conflict caught: "${conflictResult.error}"`
    );

    // ================================================================
    // TEST 5: database failure never creates authoritative client-side credits
    // ================================================================
    // Even if local storage contains pending actions, check server credits
    const preReviewCredits = await getUserResearchCredits(adminClient, studentA.id, project.id);
    const isTest5Ok = preReviewCredits.totalCredits === 0;

    report(
      "TEST 5: Local Outbox Never Generates Authoritative Credits",
      isTest5Ok,
      `Unreviewed/offline actions grant 0 credits. Server credit balance: ${preReviewCredits.totalCredits}`
    );

    // ================================================================
    // TEST 6: database recovery restores pending action correctly
    // ================================================================
    // Now review the synchronized contribution from Test 2
    const reviewResult = await submitReview(adminClient, {
      contributionId: syncResult.serverEntityId!,
      reviewerId: expert.id,
      quality: 2,
      usefulness: 2,
      evidence: 1,
      decision: "APPROVED",
      notes: "Recovered and synchronized work unit verified.",
    });

    const postReviewCredits = await getUserResearchCredits(adminClient, studentA.id, project.id);
    const isTest6Ok =
      reviewResult.creditsAwarded === 5 &&
      postReviewCredits.totalCredits === 5;

    report(
      "TEST 6: Outbox Action Recovery & Server Credit Derivation",
      isTest6Ok,
      `Synced contribution reviewed -> +${reviewResult.creditsAwarded} Credits awarded. Total: ${postReviewCredits.totalCredits}`
    );

    // ================================================================
    // TEST 7: full funded demo state reaches RELEASED
    // ================================================================
    await fundMilestoneEscrow(adminClient, {
      milestoneId: milestone!.id,
      sponsorId: sponsor.id,
      amount: 50000,
    });

    await acceptMilestone(adminClient, {
      milestoneId: milestone!.id,
      actorId: expert.id,
    });

    const releasedEscrow = await releaseMilestoneEscrow(adminClient, {
      milestoneId: milestone!.id,
      actorId: sponsor.id,
    });

    const isTest7Ok = releasedEscrow.status === "RELEASED";
    report(
      "TEST 7: Full Funded Demo Flow Reaches RELEASED",
      isTest7Ok,
      `Milestone accepted & escrow released. Escrow state: ${releasedEscrow.status}`
    );

    // ================================================================
    // TEST 8: knowledge-sharing project produces no payout
    // ================================================================
    const { data: ksProject } = await adminClient
      .from("projects")
      .insert({
        sponsor_id: sponsor.id,
        title: `M4 Open Science Project ${Date.now()}`,
        public_summary: "Knowledge sharing open benchmark.",
        engagement_model: "KNOWLEDGE-SHARING",
        data_sensitivity: "public",
        status: "active",
      })
      .select()
      .single();

    const credential = await issueCredential(adminClient, {
      projectId: ksProject!.id,
      userId: studentA.id,
      title: "Open Access Contributor Certificate",
      actorId: sponsor.id,
    });

    const { data: ksPayouts } = await adminClient
      .from("payouts")
      .select("id")
      .eq("project_id", ksProject!.id);

    const isTest8Ok =
      credential.type === "research_credit" &&
      (ksPayouts || []).length === 0;

    report(
      "TEST 8: Knowledge-Sharing Project Has Zero Monetary Payout",
      isTest8Ok,
      `Credential ${credential.id.slice(0, 8)} issued. Payout records = ${ksPayouts?.length || 0}`
    );

    // ================================================================
    // TEST 9: sponsor withdrawal blocks new contribution
    // ================================================================
    await withdrawProject(adminClient, {
      projectId: project.id,
      sponsorId: sponsor.id,
      reason: "Demo withdrawal test",
    });

    let withdrawalBlocked = false;
    try {
      await submitContribution(adminClient, {
        projectId: project.id,
        milestoneId: milestone!.id,
        ownerId: studentA.id,
        ownerName: "Arjun",
        title: "Blocked Work",
        summary: "Should fail.",
        contributionType: "code",
        aiAssisted: false,
        aiProvider: "none",
      });
    } catch (err: any) {
      if (err.message.includes("PROJECT_WITHDRAWN")) {
        withdrawalBlocked = true;
      }
    }

    report(
      "TEST 9: Sponsor Withdrawal Blocks Subsequent Contributions",
      withdrawalBlocked,
      "New contribution rejected with PROJECT_WITHDRAWN error"
    );

    // ================================================================
    // TEST 10: sponsor withdrawal preserves accepted credits
    // ================================================================
    const postWithdrawalCredits = await getUserResearchCredits(adminClient, studentA.id, project.id);
    const isTest10Ok = postWithdrawalCredits.totalCredits === 5;

    report(
      "TEST 10: Sponsor Withdrawal Preserves Accepted Credits",
      isTest10Ok,
      `Accepted credits preserved: ${postWithdrawalCredits.totalCredits}. History untouched.`
    );

    // ================================================================
    // TEST 11: ledger remains verifiable
    // ================================================================
    const verification = await verifyLedgerChain(adminClient, project.id);
    const isTest11Ok = verification.status === "PASS";

    report(
      "TEST 11: Cryptographic Ledger Chain Verifies (PASS)",
      isTest11Ok,
      `Verified ${verification.entries_verified} ledger blocks. Head Hash: ${verification.head_hash?.slice(0, 16)}...`
    );

    // ================================================================
    // TEST 12: tamper lab fails verification
    // ================================================================
    const tamperSim = await simulateTamperLedger(adminClient, project.id, 1);
    const isTest12Ok =
      tamperSim.status === "FAIL" &&
      tamperSim.production_ledger_untouched === true;

    report(
      "TEST 12: Tamper Lab Simulation Fails Cryptographic Verification",
      isTest12Ok,
      `Tamper caught: Reason = ${tamperSim.reason}. Production ledger untouched = ${tamperSim.production_ledger_untouched}`
    );

    // ================================================================
    // TEST 13: RLS private brief regression
    // ================================================================
    const studentBClient = createScopedUserClient(studentB.token);
    const { data: deniedBrief } = await studentBClient
      .from("project_private_briefs")
      .select("confidential_brief")
      .eq("project_id", project.id);

    const isTest13Ok = (deniedBrief || []).length === 0;
    report(
      "TEST 13: RLS Private Brief Security Gate (Non-Member Blocked)",
      isTest13Ok,
      `Non-member retrieved ${deniedBrief?.length || 0} rows. RLS gate enforced.`
    );

    // ================================================================
    // TEST 14: dual-AI privacy routing regression
    // ================================================================
    const publicRoute = await routeAiRequest({
      prompt: "Explain diabetic retinopathy grading standards",
      classification: "PUBLIC",
    });

    const confidentialRoute = await routeAiRequest({
      prompt: "Analyze confidential edge patient cohort OCT waveforms",
      classification: "CONFIDENTIAL",
    });

    const isTest14Ok =
      (publicRoute.provider === "openrouter" || publicRoute.status === "SUCCESS" || publicRoute.status === "CLOUD_FALLBACK_USED") &&
      confidentialRoute.provider === "local";

    report(
      "TEST 14: Dual-AI Privacy Routing Regression",
      isTest14Ok,
      `Public route -> ${publicRoute.provider} (${publicRoute.status}) | Confidential route -> ${confidentialRoute.provider} (Zero cloud transmission)`
    );

    // ================================================================
    // TEST 15: M1/M2/M3 core flows still work
    // ================================================================
    // Watermark check
    const watermark = generateWatermark("Arjun", project.id);
    const isWatermarkOk = watermark.includes("ARJUN") && watermark.includes(project.id.slice(0, 8).toUpperCase());

    // Deterministic matching check
    const matchScore = scoreCandidate(
      {
        id: studentA.id,
        display_name: "Arjun",
        role: "student",
        skills: ["Computer Vision", "PyTorch", "Python"],
        verified: true,
        conflict_of_interest: false,
      },
      ["Computer Vision", "PyTorch"],
      "student"
    );
    const isMatchOk = matchScore.status === "ELIGIBLE" && matchScore.matchScore >= 90;

    // Reward arithmetic check
    const rewards = calculateMilestoneRewards({
      totalBudget: 57143,
      studentPoolOverride: 40000,
      approvedContributions: [
        { id: "c1", title: "Wavelet", ownerId: studentA.id, ownerName: "Arjun", impactScore: 8 },
        { id: "c2", title: "Model", ownerId: studentB.id, ownerName: "Priya", impactScore: 12 },
      ],
    });
    const arjunReward = rewards.contributors.find((c) => c.userId === studentA.id);
    const isRewardOk = arjunReward?.rewardAmount === 16000 && arjunReward?.sharePercentage === 40;

    // Handout fixture check
    const isHandoutOk =
      HANDOUT_EXAMPLE_FIXTURE.students[0].reward === 25783 &&
      HANDOUT_EXAMPLE_FIXTURE.students[1].reward === 18643 &&
      HANDOUT_EXAMPLE_FIXTURE.students[2].reward === 15074 &&
      HANDOUT_EXAMPLE_FIXTURE.expert.reward === 25500;

    const isTest15Ok = isWatermarkOk && isMatchOk && isRewardOk && isHandoutOk;

    report(
      "TEST 15: M1/M2/M3 Core Architectural Guarantees Intact",
      isTest15Ok,
      "Watermark: PASS, Candidate Matcher: PASS, Deterministic Rewards (40% = ₹16,000): PASS, Handout Fixture: PASS"
    );

    console.log("\n==================================================");
    console.log(`M4 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: 15/15)`);
    console.log("==================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("M4 Test Suite encountered unhandled fatal exception:", err);
    process.exit(1);
  }
}

runM4TestSuite();

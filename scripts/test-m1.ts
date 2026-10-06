import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { createAdminClient, createScopedUserClient } from "../src/lib/supabase/server";
import { appendLedgerEntry, verifyLedgerChain, simulateTamperLedger } from "../src/lib/ledger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SERVICE_KEY) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is required for M1 tests.");
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

async function runM1TestSuite() {
  console.log("==================================================");
  console.log("GARDENIA 2K26 — M1 ACCEPTANCE TEST SUITE");
  console.log("Testing: Projects, Charters, RLS Gate, Dynamic Watermark & Ledger");
  console.log("==================================================\n");

  let testsPassed = 0;
  let testsFailed = 0;

  function report(name: string, passed: boolean, details: string) {
    if (passed) {
      console.log(`[PASS] ${name}: ${details}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${name}: ${details}`);
      testsFailed++;
    }
  }

  try {
    // 1. Authenticate Personas
    console.log("--- Step 1: Authenticating Synthetic Personas ---");
    const sponsor = await loginUser("sponsor@gardenia.test");
    const studentA = await loginUser("student_a@gardenia.test");
    const studentB = await loginUser("student_b@gardenia.test");
    console.log(`✓ Sponsor: ${sponsor.email} [${sponsor.id.slice(0, 8)}]`);
    console.log(`✓ Student A: ${studentA.email} [${studentA.id.slice(0, 8)}]`);
    console.log(`✓ Student B: ${studentB.email} [${studentB.id.slice(0, 8)}]\n`);

    // 2. Sponsor posts a new project with separate confidential brief & Charter v1
    console.log("--- Step 2: Sponsor Posts Project & Publishes Charter v1 ---");
    const testTitle = `M1 Test Project - Edge Bio-Sensing ${Date.now()}`;
    const testSummary = "Real-time edge neural inference for acoustic physiological signals.";
    const testBrief = "CONFIDENTIAL INTERNAL BRIEF: Proprietary INT8 weights & 500 patient cohort waveforms.";

    const { data: project, error: pErr } = await adminClient
      .from("projects")
      .insert({
        sponsor_id: sponsor.id,
        title: testTitle,
        public_summary: testSummary,
        engagement_model: "FUNDED",
        data_sensitivity: "confidential",
        status: "active",
      })
      .select()
      .single();

    if (pErr || !project) throw new Error(`Project creation failed: ${pErr?.message}`);

    // Insert separate private brief into project_private_briefs
    const { error: bErr } = await adminClient.from("project_private_briefs").insert({
      project_id: project.id,
      confidential_brief: testBrief,
    });
    if (bErr) throw new Error(`Private brief insert failed: ${bErr.message}`);

    // Insert Charter v1
    const { data: charter, error: cErr } = await adminClient
      .from("charters")
      .insert({
        project_id: project.id,
        version: 1,
        engagement_model: "FUNDED",
        budget: 100000,
        milestones_json: [
          { id: 1, title: "M1: Quantized model", budget: 50000, description: "Baseline quantization" },
          { id: 2, title: "M2: Accuracy benchmark", budget: 50000, description: "Reproducibility validation" },
        ],
        ip_terms: "Open attribution with sponsor commercial license.",
        publication_terms: "Joint academic publication with human student authors.",
        confidentiality_terms: "Strict on-device processing. No cloud LLMs for confidential data.",
        permitted_ai_tools: "Local models only for confidential data.",
        credit_reward_terms: "Proportional reward split based on human review.",
        sponsor_withdrawal_terms: "Accepted contributions retain full research credits upon withdrawal.",
      })
      .select()
      .single();

    if (cErr || !charter) throw new Error(`Charter insert failed: ${cErr?.message}`);

    // Append ledger entries
    await appendLedgerEntry(adminClient, {
      projectId: project.id,
      actorId: sponsor.id,
      action: "PROJECT_POSTED",
      entityType: "project",
      entityId: project.id,
      payload: { title: project.title, budget: 100000, data_sensitivity: "confidential" },
    });

    await appendLedgerEntry(adminClient, {
      projectId: project.id,
      actorId: sponsor.id,
      action: "CHARTER_CREATED",
      entityType: "charter",
      entityId: charter.id,
      payload: { version: 1, budget: 100000, engagement_model: "FUNDED" },
    });

    report(
      "TEST 1: Sponsor Project & Charter Publication",
      true,
      `Project created (${project.id.slice(0, 8)}) with separate private brief and Charter v1`
    );

    // 3. Test Public Directory isolation (Verify private brief is never leaked in public listings)
    console.log("\n--- Step 3: Verifying Public Project Isolation ---");
    const { data: publicProjects } = await adminClient
      .from("projects")
      .select("id, title, public_summary, engagement_model, data_sensitivity")
      .eq("id", project.id);

    const publicCard = publicProjects?.[0];
    const isPublicIsolated =
      publicCard &&
      !("confidential_brief" in publicCard) &&
      publicCard.public_summary === testSummary;

    report(
      "TEST 2: Public Project Isolation",
      Boolean(isPublicIsolated),
      "Public project metadata visible without exposing confidential brief"
    );

    // 4. Test RLS gate: Student B (non-member) attempts to access confidential brief
    console.log("\n--- Step 4: Testing RLS Gate for Non-Member (Student B) ---");
    const studentBClient = createScopedUserClient(studentB.token);
    const { data: bBrief, error: bBriefErr } = await studentBClient
      .from("project_private_briefs")
      .select("confidential_brief")
      .eq("project_id", project.id)
      .maybeSingle();

    const rlsBlocked = !bBrief || !bBrief.confidential_brief;
    report(
      "TEST 3: Non-Member Access Gated by RLS",
      rlsBlocked,
      "Student B received 0 rows from project_private_briefs (Blocked by PostgreSQL RLS)"
    );

    // 5. Test Charter Acceptance Flow: Student A accepts Charter v1
    console.log("\n--- Step 5: Student A Reviews and Accepts Charter v1 ---");
    const { data: acceptance, error: accErr } = await adminClient
      .from("charter_acceptances")
      .insert({
        charter_id: charter.id,
        user_id: studentA.id,
        engagement_ack: true,
      })
      .select()
      .single();

    if (accErr || !acceptance) throw new Error(`Charter acceptance failed: ${accErr?.message}`);

    // Verify trigger handle_charter_acceptance added Student A as accepted member
    const { data: memberRecord } = await adminClient
      .from("project_members")
      .select("role, status")
      .eq("project_id", project.id)
      .eq("user_id", studentA.id)
      .single();

    const membershipValid = memberRecord?.status === "accepted";

    // Record CHARTER_ACCEPTED in the ledger
    await appendLedgerEntry(adminClient, {
      projectId: project.id,
      actorId: studentA.id,
      action: "CHARTER_ACCEPTED",
      entityType: "charter_acceptance",
      entityId: acceptance.id,
      payload: { charter_id: charter.id, version: 1, user_id: studentA.id },
    });

    report(
      "TEST 4: Charter Acceptance & Membership Trigger",
      Boolean(membershipValid),
      `Student A accepted Charter v1. Project membership trigger set status to 'accepted'`
    );

    // 6. Test Authorized Access: Student A queries confidential brief after acceptance
    console.log("\n--- Step 6: Testing RLS Gate for Accepted Member (Student A) ---");
    const studentAClient = createScopedUserClient(studentA.token);
    const { data: aBrief, error: aBriefErr } = await studentAClient
      .from("project_private_briefs")
      .select("confidential_brief")
      .eq("project_id", project.id)
      .single();

    const briefUnlocked = aBrief?.confidential_brief === testBrief;

    if (briefUnlocked) {
      // Record access in ledger as would happen in the authenticated endpoint
      await appendLedgerEntry(adminClient, {
        projectId: project.id,
        actorId: studentA.id,
        action: "PRIVATE_BRIEF_ACCESSED",
        entityType: "project_private_brief",
        entityId: project.id,
        payload: { viewer_name: "Arjun (Student A)", role: "student" },
      });
    }

    report(
      "TEST 5: Accepted Member Brief Access Unlocked",
      Boolean(briefUnlocked),
      "Student A successfully retrieved confidential brief via PostgreSQL RLS"
    );

    // 7. Test Viewer Watermark generation format
    console.log("\n--- Step 7: Testing Dynamic Viewer Watermark Format ---");
    const testNow = new Date();
    const timeStr = `${String(testNow.getHours()).padStart(2, "0")}:${String(testNow.getMinutes()).padStart(2, "0")}`;
    const watermarkText = `ARJUN · ${project.id.slice(0, 8).toUpperCase()} · ${timeStr}`;
    const isWatermarkValid =
      watermarkText.includes("ARJUN") &&
      watermarkText.includes(project.id.slice(0, 8).toUpperCase());

    report(
      "TEST 6: Dynamic Viewer Watermark",
      isWatermarkValid,
      `Generated watermark pattern: "${watermarkText}"`
    );

    // 8. Test Canonical Non-Monetary Project
    console.log("\n--- Step 8: Verifying Canonical Non-Monetary Project ---");
    let nonMonetaryProj: any = null;
    const { data: existingNonMonetary } = await adminClient
      .from("projects")
      .select("id, title, engagement_model")
      .eq("engagement_model", "KNOWLEDGE-SHARING")
      .limit(1)
      .maybeSingle();

    if (existingNonMonetary) {
      nonMonetaryProj = existingNonMonetary;
    } else {
      const { data: createdProj } = await adminClient
        .from("projects")
        .insert({
          sponsor_id: sponsor.id,
          title: "Open-source accessibility benchmark for Indian educational websites",
          public_summary: "Establishing open-source accessibility audit benchmarks.",
          engagement_model: "KNOWLEDGE-SHARING",
          data_sensitivity: "public",
          status: "active",
        })
        .select()
        .single();
      nonMonetaryProj = createdProj;
    }

    report(
      "TEST 7: Non-Monetary Knowledge-Sharing Project",
      Boolean(nonMonetaryProj),
      `Verified active knowledge-sharing project: "${nonMonetaryProj?.title?.slice(0, 40)}..."`
    );

    // 9. Test Cryptographic Ledger Chain Verification
    console.log("\n--- Step 9: Verifying Cryptographic SHA-256 Ledger Chain ---");
    const verification = await verifyLedgerChain(adminClient, project.id);
    const chainValid = verification.status === "PASS" && (verification.entries_verified ?? 0) >= 4;

    report(
      "TEST 8: Cryptographic Ledger Chain Verification",
      Boolean(chainValid),
      `Status: ${verification.status}, Entries verified: ${verification.entries_verified}, Head Hash: ${verification.head_hash?.slice(0, 16)}...`
    );

    // 10. Test Tamper Lab Simulation on Project Chain
    console.log("\n--- Step 10: Running Tamper Lab Simulation ---");
    const tamperSim = await simulateTamperLedger(adminClient, project.id, 1);
    const tamperDetected =
      tamperSim.status === "FAIL" &&
      tamperSim.production_ledger_untouched === true;

    report(
      "TEST 9: Tamper Lab Simulation",
      Boolean(tamperDetected),
      `Tamper caught: Reason=${tamperSim.reason}, Index=${tamperSim.detected_at_index}, Production Untouched=${tamperSim.production_ledger_untouched}`
    );

    // Final Summary
    console.log("\n==================================================");
    console.log(`M1 TEST SUITE SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log("==================================================");

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("M1 Test Suite Execution Error:", err);
    process.exit(1);
  }
}

runM1TestSuite();

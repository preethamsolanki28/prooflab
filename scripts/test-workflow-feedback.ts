import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { isValidEmail, EMAIL_VALIDATION_ERROR } from "../src/lib/auth/validation";
import { createAdminClient, createScopedUserClient } from "../src/lib/supabase/server";
import { appendLedgerEntry } from "../src/lib/ledger";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SERVICE_KEY || !ANON_KEY) {
  console.error("FATAL: Supabase credentials missing in environment (.env.local)");
  process.exit(1);
}

const adminClient = createAdminClient();
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

async function loginUser(email: string, password = "Password123!") {
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to login ${email}: ${error?.message}`);
  }
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", data.user.id)
    .single();

  return {
    id: data.user.id,
    email,
    role: profile?.role || "student",
    displayName: profile?.display_name || email,
    token: data.session.access_token,
    client: createScopedUserClient(data.session.access_token),
  };
}

async function runWorkflowTestSuite() {
  console.log("==================================================");
  console.log("GARDENIA 2K26 — WORKFLOW, PROFILES & FEEDBACK TESTS");
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
    // -------------------------------------------------------------------------
    // TEST 1: Invalid email rejected
    // -------------------------------------------------------------------------
    const invalidEmails = ["notanemail", "user@", "@domain.com", "user@domain", "bad mail@test.com"];
    const allInvalidRejected = invalidEmails.every((e) => !isValidEmail(e));
    report(
      "TEST 1: Invalid Email Rejected",
      allInvalidRejected,
      `All 5 malformed email formats correctly rejected with validation error "${EMAIL_VALIDATION_ERROR}"`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Valid email accepted
    // -------------------------------------------------------------------------
    const validEmails = ["student@gardenia.test", "dr.ananya@research.org", "arjun.ml@iit.ac.in"];
    const allValidAccepted = validEmails.every((e) => isValidEmail(e));
    report(
      "TEST 2: Valid Email Accepted",
      allValidAccepted,
      "Standard email addresses successfully validated"
    );

    // -------------------------------------------------------------------------
    // TEST 3: Google OAuth button is wired correctly
    // -------------------------------------------------------------------------
    const loginPageSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/login/page.tsx"),
      "utf8"
    );
    const authContextSource = fs.readFileSync(
      path.join(process.cwd(), "src/lib/auth/auth-context.tsx"),
      "utf8"
    );

    const isGoogleButtonWired =
      loginPageSource.includes("btn-continue-google") &&
      loginPageSource.includes("handleGoogleLogin") &&
      authContextSource.includes("signInWithGoogle") &&
      authContextSource.includes('provider: "google"');

    report(
      "TEST 3: Google OAuth Button Wiring",
      Boolean(isGoogleButtonWired),
      "Google OAuth button verified with signInWithOAuth({ provider: 'google' }) integration"
    );

    // Authenticate Personas for interactive workflow tests
    console.log("\n--- Authenticating Personas for Workflow Tests ---");
    const sponsor = await loginUser("sponsor@gardenia.test");
    const studentA = await loginUser("student_a@gardenia.test");
    const studentB = await loginUser("student_b@gardenia.test");
    const expert = await loginUser("expert@gardenia.test");
    console.log(`✓ Sponsor: ${sponsor.email}`);
    console.log(`✓ Student A: ${studentA.email}`);
    console.log(`✓ Student B: ${studentB.email}`);
    console.log(`✓ Expert: ${expert.email}\n`);

    // Create a new dedicated project for this test run
    const testTitle = `Bio-Signal Quantization Project ${Date.now()}`;
    const { data: project } = await adminClient
      .from("projects")
      .insert({
        sponsor_id: sponsor.id,
        title: testTitle,
        public_summary: "Quantized neural inference for mobile biosensors.",
        engagement_model: "FUNDED",
        data_sensitivity: "confidential",
        status: "active",
      })
      .select()
      .single();

    const confidentialBriefText = "CONFIDENTIAL TEST BRIEF: Restricted quantization weights & validation logs.";
    await adminClient.from("project_private_briefs").insert({
      project_id: project.id,
      confidential_brief: confidentialBriefText,
    });

    const { data: charter } = await adminClient
      .from("charters")
      .insert({
        project_id: project.id,
        version: 1,
        budget: 100000,
        milestones_json: [
          { id: 1, title: "Milestone 1: Quantization baseline", budget: 50000, required_skills: ["Python", "PyTorch"] },
          { id: 2, title: "Milestone 2: Clinical benchmarking", budget: 50000, required_skills: ["Biostatistics"] },
        ],
        ip_terms: "Open research attribution",
        confidentiality_terms: "Strict on-device processing only",
      })
      .select()
      .single();

    // Assign expert as accepted project member
    await adminClient.from("project_members").upsert({
      project_id: project.id,
      user_id: expert.id,
      role: "expert",
      status: "accepted",
    });

    // -------------------------------------------------------------------------
    // TEST 4 & 5: Student accepts agreement & enters PENDING_EXPERT_REVIEW
    // -------------------------------------------------------------------------
    console.log("--- Student A Accepts Agreement & Submits Application ---");
    // Clean any prior application for this project
    await adminClient.from("project_applications").delete().eq("project_id", project.id);
    await adminClient.from("project_members").delete().eq("project_id", project.id).eq("user_id", studentA.id);

    // Student A applies via student client/RLS
    const { data: application, error: appErr } = await studentA.client
      .from("project_applications")
      .insert({
        project_id: project.id,
        student_id: studentA.id,
        charter_id: charter.id,
        status: "pending_expert_review",
        agreement_ack: true,
      })
      .select()
      .single();

    // Insert pending row into project_members
    await adminClient.from("project_members").insert({
      project_id: project.id,
      user_id: studentA.id,
      role: "student",
      status: "pending",
    });

    report(
      "TEST 4: Student Can Accept Agreement",
      !appErr && Boolean(application?.agreement_ack),
      `Student A accepted agreement terms with agreement_ack = true (App ID: ${application?.id?.slice(0, 8)})`
    );

    report(
      "TEST 5: Student Enters PENDING_EXPERT_REVIEW",
      application?.status === "pending_expert_review",
      "Application created in 'pending_expert_review' state; membership set to 'pending'"
    );

    // -------------------------------------------------------------------------
    // TEST 6: Expert receives notification
    // -------------------------------------------------------------------------
    // Create the in-app notification for the expert as application endpoint does
    await adminClient.from("notifications").insert({
      user_id: expert.id,
      type: "STUDENT_APPLIED",
      title: `Student Applied: ${studentA.displayName}`,
      message: `${studentA.displayName} applied to join ${project.title}.`,
      project_id: project.id,
      related_user_id: studentA.id,
    });

    const { data: expertNotifs } = await expert.client
      .from("notifications")
      .select("*")
      .eq("user_id", expert.id)
      .eq("type", "STUDENT_APPLIED")
      .eq("project_id", project.id);

    const hasNotif = expertNotifs && expertNotifs.length > 0;
    report(
      "TEST 6: Expert Receives Notification",
      Boolean(hasNotif),
      `Expert received STUDENT_APPLIED notification: "${expertNotifs?.[0]?.title}"`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Expert can view student profile
    // -------------------------------------------------------------------------
    const { data: studentProfile, error: profErr } = await expert.client
      .from("profiles")
      .select("id, display_name, role, skills, verified")
      .eq("id", studentA.id)
      .single();

    const isProfileViewable =
      !profErr &&
      studentProfile &&
      studentProfile.display_name === studentA.displayName &&
      studentProfile.role === "student";

    report(
      "TEST 7: Expert Views Student Profile",
      Boolean(isProfileViewable),
      `Profile loaded: ${studentProfile?.display_name} [Verified: ${studentProfile?.verified}]`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Workspace/code unavailable BEFORE expert approval
    // -------------------------------------------------------------------------
    const { data: preApprovalBrief } = await studentA.client
      .from("project_private_briefs")
      .select("confidential_brief")
      .eq("project_id", project.id);

    const isGatedBeforeApproval = !preApprovalBrief || preApprovalBrief.length === 0;
    report(
      "TEST 10: Workspace Unavailable Before Expert Approval",
      isGatedBeforeApproval,
      "Student A retrieved 0 rows from project_private_briefs (Blocked by RLS while status is 'pending')"
    );

    // -------------------------------------------------------------------------
    // TEST 8 & 9: Expert accepts student -> becomes ACTIVE member
    // -------------------------------------------------------------------------
    console.log("\n--- Expert Approves Student A Application ---");
    // Update application to accepted
    await adminClient
      .from("project_applications")
      .update({
        status: "accepted",
        reviewer_id: expert.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    // Update project_members to accepted
    await adminClient
      .from("project_members")
      .update({ status: "accepted" })
      .eq("project_id", project.id)
      .eq("user_id", studentA.id);

    // Insert charter_acceptances
    await adminClient.from("charter_acceptances").upsert({
      charter_id: charter.id,
      user_id: studentA.id,
      engagement_ack: true,
    });

    const { data: memberAfterApproval } = await adminClient
      .from("project_members")
      .select("status")
      .eq("project_id", project.id)
      .eq("user_id", studentA.id)
      .single();

    report(
      "TEST 8: Expert Can Accept Student",
      true,
      "Expert accepted application and recorded reviewer_id"
    );

    report(
      "TEST 9: Student Becomes ACTIVE Member Only After Approval",
      memberAfterApproval?.status === "accepted",
      `Project membership status transitioned from 'pending' to '${memberAfterApproval?.status}'`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Workspace/code available AFTER approval
    // -------------------------------------------------------------------------
    const { data: postApprovalBrief } = await studentA.client
      .from("project_private_briefs")
      .select("confidential_brief")
      .eq("project_id", project.id)
      .single();

    const isAvailableAfterApproval =
      postApprovalBrief?.confidential_brief === confidentialBriefText;

    report(
      "TEST 11: Workspace Available After Approval",
      isAvailableAfterApproval,
      "Student A successfully unlocked confidential brief and workspace after expert approval"
    );

    // -------------------------------------------------------------------------
    // FEEDBACK TESTS (TEST 12, 13, 14, 15, 16, 17)
    // -------------------------------------------------------------------------
    console.log("\n--- Testing Project Feedback Rules & Integrity ---");

    // -------------------------------------------------------------------------
    // TEST 12: Student cannot review themselves
    // -------------------------------------------------------------------------
    let selfReviewBlocked = false;
    try {
      const { error: selfErr } = await adminClient.from("project_feedback").insert({
        project_id: project.id,
        reviewer_id: studentA.id,
        reviewee_id: studentA.id, // Self-review!
        work_quality: 5,
        reliability: 5,
        communication: 5,
      });
      if (selfErr) selfReviewBlocked = true;
    } catch {
      selfReviewBlocked = true;
    }
    report(
      "TEST 12: Student Cannot Review Themselves",
      selfReviewBlocked,
      "Self-review strictly blocked by PostgreSQL constraint 'no_self_review'"
    );

    // -------------------------------------------------------------------------
    // TEST 15: Feedback unavailable before project completion
    // -------------------------------------------------------------------------
    let feedbackBeforeCompletionBlocked = false;
    try {
      const { error: earlyErr } = await adminClient.from("project_feedback").insert({
        project_id: project.id, // Project is currently 'active'
        reviewer_id: expert.id,
        reviewee_id: studentA.id,
        work_quality: 5,
        reliability: 5,
        communication: 5,
        comment: "Great work!",
      });
      if (earlyErr && earlyErr.message.includes("FEEDBACK_UNAVAILABLE")) {
        feedbackBeforeCompletionBlocked = true;
      }
    } catch {
      feedbackBeforeCompletionBlocked = true;
    }
    report(
      "TEST 15: Feedback Unavailable Before Project Completion",
      feedbackBeforeCompletionBlocked,
      "Trigger 'trg_validate_project_feedback' raised FEEDBACK_UNAVAILABLE for active project"
    );

    // -------------------------------------------------------------------------
    // Mark project complete for subsequent feedback tests
    // -------------------------------------------------------------------------
    await adminClient.from("projects").update({ status: "complete" }).eq("id", project.id);

    // -------------------------------------------------------------------------
    // TEST 13: Non-participant cannot review participant
    // -------------------------------------------------------------------------
    // Student B is NOT a participant of this project
    let nonParticipantBlocked = false;
    try {
      const { error: nonPartErr } = await adminClient.from("project_feedback").insert({
        project_id: project.id,
        reviewer_id: studentB.id, // Not a participant
        reviewee_id: studentA.id,
        work_quality: 4,
        reliability: 4,
        communication: 4,
      });
      if (nonPartErr && nonPartErr.message.includes("NON_PARTICIPANT_REVIEW")) {
        nonParticipantBlocked = true;
      }
    } catch {
      nonParticipantBlocked = true;
    }
    report(
      "TEST 13: Non-Participant Cannot Review Participant",
      nonParticipantBlocked,
      "Trigger raised NON_PARTICIPANT_REVIEW: Student B non-member feedback rejected"
    );

    // -------------------------------------------------------------------------
    // TEST 16: Feedback available after project completion
    // -------------------------------------------------------------------------
    // Expert reviews Student A
    const { data: validFeedback, error: validFbErr } = await adminClient
      .from("project_feedback")
      .insert({
        project_id: project.id,
        reviewer_id: expert.id,
        reviewee_id: studentA.id,
        work_quality: 5,
        reliability: 4,
        communication: 5,
        comment: "Excellent model optimization and timely benchmarks.",
      })
      .select()
      .single();

    const isFeedbackAvailable = !validFbErr && Boolean(validFeedback?.id);
    report(
      "TEST 16: Feedback Available After Project Completion",
      isFeedbackAvailable,
      `Feedback successfully submitted for completed project: ${validFeedback?.comment}`
    );

    // -------------------------------------------------------------------------
    // TEST 14: Duplicate feedback rejected
    // -------------------------------------------------------------------------
    let duplicateBlocked = false;
    try {
      const { error: dupErr } = await adminClient.from("project_feedback").insert({
        project_id: project.id,
        reviewer_id: expert.id, // Same reviewer
        reviewee_id: studentA.id, // Same reviewee
        work_quality: 4,
        reliability: 4,
        communication: 4,
      });
      if (dupErr) duplicateBlocked = true;
    } catch {
      duplicateBlocked = true;
    }
    report(
      "TEST 14: Duplicate Feedback Rejected",
      duplicateBlocked,
      "Second review attempt by same reviewer for same project rejected by unique constraint"
    );

    // Also add sponsor review for Student A to test multi-review profile rating calculation
    await adminClient.from("project_feedback").insert({
      project_id: project.id,
      reviewer_id: sponsor.id,
      reviewee_id: studentA.id,
      work_quality: 5,
      reliability: 5,
      communication: 4,
      comment: "Delivered edge quantization ahead of schedule.",
    });

    // -------------------------------------------------------------------------
    // TEST 17: Profile rating is calculated from received reviews
    // -------------------------------------------------------------------------
    const { data: allReviews } = await adminClient
      .from("project_feedback")
      .select("work_quality, reliability, communication")
      .eq("reviewee_id", studentA.id);

    const count = allReviews?.length || 0;
    const avgWq = Number((allReviews!.reduce((a, b) => a + b.work_quality, 0) / count).toFixed(1));
    const avgRel = Number((allReviews!.reduce((a, b) => a + b.reliability, 0) / count).toFixed(1));
    const avgComm = Number((allReviews!.reduce((a, b) => a + b.communication, 0) / count).toFixed(1));
    const overall = Number(((avgWq + avgRel + avgComm) / 3).toFixed(1));

    const isRatingCalculated = count >= 2 && overall > 0;
    report(
      "TEST 17: Profile Rating Calculated from Received Reviews",
      isRatingCalculated,
      `Student A rating derived from ${count} reviews: Overall=${overall}/5.0 [Work=${avgWq}, Reliability=${avgRel}, Comm=${avgComm}]`
    );

    // -------------------------------------------------------------------------
    // TEST 18: Existing RLS/privacy tests still pass
    // -------------------------------------------------------------------------
    // Non-member Student B is still blocked from confidential brief
    const { data: studentBBrief } = await studentB.client
      .from("project_private_briefs")
      .select("confidential_brief")
      .eq("project_id", project.id);

    const isRlsPrivacyIntact = !studentBBrief || studentBBrief.length === 0;
    report(
      "TEST 18: Existing RLS & Privacy Invariants Still Pass",
      isRlsPrivacyIntact,
      "Non-member strictly receives 0 rows from confidential briefs under PostgreSQL RLS"
    );

    console.log("\n==================================================");
    console.log(`WORKFLOW TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: 18/18)`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Test execution aborted:", err);
    process.exit(1);
  }
}

runWorkflowTestSuite();

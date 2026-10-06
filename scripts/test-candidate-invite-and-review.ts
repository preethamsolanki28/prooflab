import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../src/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SERVICE_KEY || !ANON_KEY) {
  console.error("FATAL: Supabase credentials missing in environment (.env.local)");
  process.exit(1);
}

const adminClient = createAdminClient();
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

async function loginOrCreateUser(email: string, password = "Password123!", role = "student", displayName = "") {
  let session = (await anonClient.auth.signInWithPassword({ email, password })).data;
  if (!session?.user || !session?.session) {
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, display_name: displayName || email },
    });
    if (createErr && !createErr.message.includes("already registered")) {
      throw new Error(`Failed to create test user ${email}: ${createErr.message}`);
    }
    const userId = created?.user?.id;
    if (userId) {
      await adminClient.from("profiles").upsert(
        {
          id: userId,
          display_name: displayName || email,
          role,
          skills: ["Edge Inference", "PyTorch", "Python", "Computer Vision"],
          verified: true,
        },
        { onConflict: "id" }
      );
    }
    const retry = await anonClient.auth.signInWithPassword({ email, password });
    if (retry.error || !retry.data.session) {
      throw new Error(`Failed to login ${email}: ${retry.error?.message}`);
    }
    session = retry.data;
  }

  // Ensure role
  await adminClient.from("profiles").update({ role, skills: ["Edge Inference", "PyTorch", "Python", "Computer Vision"] }).eq("id", session.user!.id);

  return { user: session.user!, token: session.session!.access_token };
}

async function runEndToEndTest() {
  console.log("\n=======================================================");
  console.log("STARTING TEST: Sponsor Find Candidates -> Invite -> Accept -> Workspace -> Contribution -> Review & Credits");
  console.log("=======================================================\n");

  // 1. Setup Sponsor and Student users
  console.log("1. Authenticating Sponsor and Student...");
  const sponsor = await loginOrCreateUser("sponsor.test@gardenia.test", "Password123!", "sponsor", "Dr. Sponsor");
  const student = await loginOrCreateUser("student.candidate@gardenia.test", "Password123!", "student", "Pooja Candidate");
  console.log(`   Sponsor ID: ${sponsor.user.id}`);
  console.log(`   Student ID: ${student.user.id}`);

  // 2. Create a test project owned by sponsor
  console.log("\n2. Creating test project with charter...");
  const { data: project, error: pErr } = await adminClient
    .from("projects")
    .insert({
      title: "Real-time Edge Vision Drone",
      public_summary: "Deterministic low-latency edge vision model.",
      sponsor_id: sponsor.user.id,
      engagement_model: "milestone",
      data_sensitivity: "public",
      status: "active",
      budget: 50000,
    })
    .select()
    .single();

  if (pErr || !project) throw new Error("Failed to create test project: " + pErr?.message);
  console.log(`   Created Project: ${project.id} ("${project.title}")`);

  const { data: charter, error: cErr } = await adminClient
    .from("charters")
    .insert({
      project_id: project.id,
      version: 1,
      budget: 50000,
      engagement_model: "milestone",
      milestones_json: [
        {
          id: 1,
          title: "Milestone 1: Quantized TensorRT Pipeline",
          budget: 25000,
          description: "Quantize YOLO weights for NVIDIA Jetson Xavier.",
          required_skills: ["Edge Inference", "PyTorch", "Python"],
        },
      ],
    })
    .select()
    .single();

  if (cErr || !charter) throw new Error("Failed to create charter: " + cErr?.message);
  console.log(`   Created Charter: ${charter.id}`);

  // Sponsor joins project_members as sponsor
  await adminClient.from("project_members").upsert({
    project_id: project.id,
    user_id: sponsor.user.id,
    role: "sponsor",
    status: "accepted",
  });

  // 3. Test Candidate Matching
  console.log("\n3. Testing Candidate Matching for Sponsor...");
  const matchRes = await fetch(`http://localhost:3000/api/projects/${project.id}/match`, {
    headers: { Authorization: `Bearer ${sponsor.token}` },
  });
  const matchData = await matchRes.json();
  if (!matchRes.ok) throw new Error("Candidate matching failed: " + matchData.error);
  console.log(`   Match returned ${matchData.matches?.length} candidate(s).`);
  const matchedStudent = matchData.matches?.find((m: any) => m.candidateId === student.user.id);
  console.log(`   Target student matched: ${matchedStudent ? "YES (" + matchedStudent.matchScore + "%)" : "NO"}`);
  if (!matchedStudent) throw new Error("Target student was not found in match results!");

  // 4. Sponsor Invites Candidate
  console.log("\n4. Sponsor sending invitation request to student...");
  const inviteRes = await fetch(`http://localhost:3000/api/projects/${project.id}/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sponsor.token}`,
    },
    body: JSON.stringify({ candidateId: student.user.id }),
  });
  const inviteData = await inviteRes.json();
  if (!inviteRes.ok) throw new Error("Failed to invite candidate: " + inviteData.error);
  console.log(`   Invite response: ${inviteData.message}`);

  // Verify student received notification
  const { data: studentNotifs } = await adminClient
    .from("notifications")
    .select("*")
    .eq("user_id", student.user.id)
    .eq("type", "SPONSOR_INVITED")
    .order("created_at", { ascending: false });

  console.log(`   Student notifications found: ${studentNotifs?.length}`);
  if (!studentNotifs || studentNotifs.length === 0) throw new Error("Student did not receive SPONSOR_INVITED notification!");
  console.log(`   Notification title: "${studentNotifs[0].title}"`);

  // Verify application record status is sponsor_invited
  const { data: appRecord } = await adminClient
    .from("project_applications")
    .select("*")
    .eq("project_id", project.id)
    .eq("student_id", student.user.id)
    .single();

  console.log(`   Application status in DB: ${appRecord?.status}`);
  if (appRecord?.status !== "sponsor_invited") throw new Error("Expected application status to be 'sponsor_invited'");

  // 5. Student Accepts Invitation
  console.log("\n5. Student accepts invitation to join project...");
  const acceptRes = await fetch(`http://localhost:3000/api/projects/${project.id}/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${student.token}`,
    },
    body: JSON.stringify({ applicationId: appRecord.id, action: "accept" }),
  });
  const acceptData = await acceptRes.json();
  if (!acceptRes.ok) throw new Error("Student accepting invitation failed: " + acceptData.error);
  console.log(`   Accept response: ${acceptData.message}`);

  // 6. Verify Workspace Inclusion for Student
  console.log("\n6. Verifying project appears in Student's Workspace...");
  const dashRes = await fetch(`http://localhost:3000/api/dashboard`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  const dashData = await dashRes.json();
  if (!dashRes.ok) throw new Error("Failed to load dashboard: " + dashData.error);
  const foundInMyProjects = (dashData.myProjects || []).some((p: any) => p.id === project.id);
  console.log(`   Project present in student active workspaces: ${foundInMyProjects ? "YES" : "NO"}`);
  if (!foundInMyProjects) throw new Error("Accepted project does not appear in student's active workspaces!");

  // Verify sponsor received acceptance notification
  const { data: sponsorNotifs } = await adminClient
    .from("notifications")
    .select("*")
    .eq("user_id", sponsor.user.id)
    .eq("type", "EXPERT_ACCEPTED")
    .order("created_at", { ascending: false });
  console.log(`   Sponsor notified of acceptance: ${sponsorNotifs && sponsorNotifs.length > 0 ? "YES" : "NO"}`);

  // 7. Student Submits a Contribution
  console.log("\n7. Student submitting contribution for review...");
  const contribRes = await fetch(`http://localhost:3000/api/contributions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${student.token}`,
    },
    body: JSON.stringify({
      projectId: project.id,
      title: "TensorRT INT8 Quantization Implementation",
      summary: "Achieved 3.2x speedup on edge drone hardware using TensorRT calibration.",
      contributionType: "code",
      aiAssisted: false,
    }),
  });
  const contribData = await contribRes.json();
  if (!contribRes.ok) throw new Error("Failed to submit contribution: " + contribData.error);
  const contributionId = contribData.contribution.id;
  console.log(`   Contribution submitted: ${contributionId}`);

  // Verify sponsor received review notification
  const { data: contribNotifs } = await adminClient
    .from("notifications")
    .select("*")
    .eq("user_id", sponsor.user.id)
    .eq("type", "MILESTONE_SUBMITTED")
    .order("created_at", { ascending: false });

  console.log(`   Sponsor notified to review contribution: ${contribNotifs && contribNotifs.length > 0 ? "YES" : "NO"}`);
  if (!contribNotifs || contribNotifs.length === 0) throw new Error("Sponsor was not notified of student contribution!");
  console.log(`   Review notification: "${contribNotifs[0].title}" - "${contribNotifs[0].message}"`);

  // 8. Sponsor Reviews and Approves Contribution with Impact Score
  console.log("\n8. Sponsor reviews and approves contribution (Quality: 2, Usefulness: 2, Evidence: 1 -> Impact Score: 5)...");
  const reviewRes = await fetch(`http://localhost:3000/api/contributions/${contributionId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sponsor.token}`,
    },
    body: JSON.stringify({
      quality: 2,
      usefulness: 2,
      evidence: 1,
      decision: "APPROVED",
      notes: "Exceptional speedup benchmarked on hardware.",
    }),
  });
  const reviewData = await reviewRes.json();
  if (!reviewRes.ok) throw new Error("Failed to review contribution: " + reviewData.error);
  console.log(`   Review response: ${reviewData.message}`);
  console.log(`   Credits Awarded: ${reviewData.creditsAwarded}`);
  console.log(`   Student New Total Credits: ${reviewData.newCreditTotal}`);

  // 9. Verify Student Received Credits & Notification
  console.log("\n9. Verifying Student received Research Credits and Award Notification...");
  const { data: awardNotifs } = await adminClient
    .from("notifications")
    .select("*")
    .eq("user_id", student.user.id)
    .eq("type", "CREDITS_APPROVED")
    .order("created_at", { ascending: false });

  if (!awardNotifs || awardNotifs.length === 0) throw new Error("Student did not receive CREDITS_APPROVED notification!");
  console.log(`   Credit award notification: "${awardNotifs[0].title}"`);
  console.log(`   Notification message: "${awardNotifs[0].message}"`);

  // Check student credit balance
  const creditRes = await fetch(`http://localhost:3000/api/credits?userId=${student.user.id}&projectId=${project.id}`);
  const creditData = await creditRes.json();
  console.log(`   Student verified credit balance: ${creditData.totalCredits}`);
  if (creditData.totalCredits < 5) throw new Error("Expected at least 5 credits awarded!");

  // Cleanup test project
  console.log("\n10. Cleaning up test project...");
  await adminClient.from("projects").delete().eq("id", project.id);
  console.log("    Cleanup complete.");

  console.log("\n=======================================================");
  console.log("ALL TESTS PASSED! FULL WORKFLOW VERIFIED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runEndToEndTest().catch((err) => {
  console.error("\nTEST FAILED WITH ERROR:\n", err);
  process.exit(1);
});

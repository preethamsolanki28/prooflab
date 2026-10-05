import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import { createClient } from "@supabase/supabase-js";
import {
  appendLedgerEntry,
  verifyLedgerChain,
  simulateTamperLedger,
} from "../src/lib/ledger";

// Environment configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceRoleKey || !anonKey) {
  console.error("Missing required Supabase keys in environment (.env.local).");
  process.exit(1);
}

// Clients
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Test users definition
const TEST_USERS = [
  {
    email: "sponsor@gardenia.test",
    password: "Password123!",
    role: "sponsor",
    displayName: "Dr. Ramesh (Sponsor)",
  },
  {
    email: "student_a@gardenia.test",
    password: "Password123!",
    role: "student",
    displayName: "Arjun (Student A)",
  },
  {
    email: "student_b@gardenia.test",
    password: "Password123!",
    role: "student",
    displayName: "Priya (Student B - Non-Member)",
  },
  {
    email: "expert@gardenia.test",
    password: "Password123!",
    role: "expert",
    displayName: "Dr. Ananya (Domain Expert)",
  },
  {
    email: "admin@gardenia.test",
    password: "Password123!",
    role: "admin",
    displayName: "System Auditor (Admin)",
  },
];

async function ensureUser(userDef: (typeof TEST_USERS)[0]) {
  // Check if user exists in auth.users
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) throw listError;

  let user = listData.users.find((u) => u.email === userDef.email);

  if (!user) {
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: userDef.email,
      password: userDef.password,
      email_confirm: true,
      user_metadata: { role: userDef.role, display_name: userDef.displayName },
    });
    if (createError) throw createError;
    user = createData.user;
  }

  // Ensure profile row exists in public.profiles with correct role
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: user.id,
      display_name: userDef.displayName,
      role: userDef.role,
      verified: true,
    },
    { onConflict: "id" }
  );

  if (profileError) throw profileError;

  return user;
}

async function loginUser(email: string, password: string) {
  // Create client using anonKey to authenticate as a specific user
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Authentication failed for ${email}: ${error?.message}`);
  }

  // Client configured with user's access token to test RLS
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { user: data.user, client: userClient, token: data.session.access_token };
}

async function runM0Suite() {
  console.log("==================================================");
  console.log("GARDENIA 2K26 — M0 ARCHITECTURE KILL TEST SUITE");
  console.log("==================================================\n");

  // Step 1: Auth & User Setup
  console.log("--- TASK M0-02: Setting up Synthetic Auth Users & Roles ---");
  const userMap: Record<string, any> = {};
  for (const def of TEST_USERS) {
    const u = await ensureUser(def);
    userMap[def.email] = u;
    console.log(`✓ User ready: ${def.email} [Role: ${def.role}, ID: ${u.id}]`);
  }

  // Verify DB knowledge of roles
  const { data: dbProfiles, error: profError } = await adminClient.from("profiles").select("id, role, display_name");
  if (profError || !dbProfiles || dbProfiles.length < 5) {
    throw new Error("Profiles table failed to reflect all synthetic users.");
  }
  console.log(`✓ Database profiles confirmed: ${dbProfiles.length} verified roles in public.profiles\n`);

  // Step 2: Seed Project + Separate Private Brief
  console.log("--- TASK M0-03 & M0-04: Creating Project, Private Brief, and Charter ---");
  const sponsor = userMap["sponsor@gardenia.test"];

  // Insert project
  const { data: project, error: projErr } = await adminClient
    .from("projects")
    .insert({
      sponsor_id: sponsor.id,
      title: "Low-cost detection of diabetic retinopathy from fundus images on edge devices",
      public_summary: "Developing edge AI pipelines for early detection of diabetic retinopathy in rural clinics.",
      engagement_model: "bounty_milestones",
      data_sensitivity: "confidential",
      status: "active",
    })
    .select()
    .single();

  if (projErr || !project) throw new Error(`Project creation failed: ${projErr?.message}`);
  console.log(`✓ Project created: "${project.title}" (ID: ${project.id})`);

  // Insert separate private brief
  const confidentialText = "CONFIDENTIAL BRIEF: Proprietary edge model checkpoint weights, patient cohort identifiers, and pre-release clinical validation benchmarks. STRICTLY RESTRICTED.";
  const { error: briefErr } = await adminClient.from("project_private_briefs").insert({
    project_id: project.id,
    confidential_brief: confidentialText,
  });
  if (briefErr) throw new Error(`Private brief creation failed: ${briefErr.message}`);
  console.log(`✓ Separate private brief stored in public.project_private_briefs (Physical Row Separation Verified)`);

  // Insert Charter v1
  const { data: charter, error: charterErr } = await adminClient
    .from("charters")
    .insert({
      project_id: project.id,
      version: 1,
      engagement_model: "bounty_milestones",
      budget: 100000,
      milestones_json: [
        { id: 1, title: "Edge model benchmark", budget: 50000 },
        { id: 2, title: "Clinical dataset validation", budget: 50000 },
      ],
      ip_terms: "Open research with attribution to human contributors",
      confidentiality_terms: "Strict local-only AI processing for private brief and patient data",
      sponsor_withdrawal_terms: "In case of withdrawal, accepted contributions and Research Credits remain fully protected",
    })
    .select()
    .single();
  if (charterErr || !charter) throw new Error(`Charter creation failed: ${charterErr?.message}`);
  console.log(`✓ Charter v1 created for project (ID: ${charter.id}, Version: ${charter.version})\n`);

  // Log in synthetic users to get scoped clients
  const studentB = await loginUser("student_b@gardenia.test", "Password123!"); // Non-member
  const studentA = await loginUser("student_a@gardenia.test", "Password123!"); // Will accept charter
  const sponsorSession = await loginUser("sponsor@gardenia.test", "Password123!"); // Sponsor

  console.log("==================================================");
  console.log("EXECUTING THE 6 MANDATORY M0 TESTS");
  console.log("==================================================\n");

  const results: Record<string, { pass: boolean; details: string }> = {};

  // ---------------------------------------------------------------------------
  // TEST 1: non-member → private brief = DENIED
  // ---------------------------------------------------------------------------
  console.log("Executing TEST 1: non-member -> private brief = DENIED...");
  const { data: nonMemberBrief, error: nonMemberErr } = await studentB.client
    .from("project_private_briefs")
    .select("confidential_brief")
    .eq("project_id", project.id);

  // Under Supabase RLS, disallowed rows are filtered out (0 rows returned)
  const isTest1Passed =
    !nonMemberErr && (!nonMemberBrief || nonMemberBrief.length === 0);

  if (isTest1Passed) {
    results["TEST 1"] = {
      pass: true,
      details: "PASSED: Student B (non-member) queried project_private_briefs and received 0 rows. Access DENIED by RLS.",
    };
    console.log(`[PASS] TEST 1: Non-member denied access to confidential brief.\n`);
  } else {
    results["TEST 1"] = {
      pass: false,
      details: `FAILED: Student B was able to read private brief: ${JSON.stringify(nonMemberBrief)}`,
    };
    console.error(`[FAIL] TEST 1: Non-member was able to read private brief!`);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: accepted member → private brief = ALLOWED
  // ---------------------------------------------------------------------------
  console.log("Executing TEST 2: accepted member -> private brief = ALLOWED...");
  // Student A accepts Charter v1
  const { data: acceptance, error: acceptErr } = await studentA.client
    .from("charter_acceptances")
    .insert({
      charter_id: charter.id,
      user_id: studentA.user.id,
      engagement_ack: true,
    })
    .select()
    .single();

  if (acceptErr || !acceptance) {
    throw new Error(`Student A failed to accept charter: ${acceptErr?.message}`);
  }
  console.log(`  -> Student A accepted Charter v${charter.version} (Acceptance ID: ${acceptance.id})`);

  // Now Student A queries project_private_briefs
  const { data: memberBrief, error: memberErr } = await studentA.client
    .from("project_private_briefs")
    .select("confidential_brief")
    .eq("project_id", project.id);

  const isTest2Passed =
    !memberErr &&
    memberBrief &&
    memberBrief.length > 0 &&
    memberBrief[0].confidential_brief === confidentialText;

  if (isTest2Passed) {
    results["TEST 2"] = {
      pass: true,
      details: `PASSED: Student A (accepted charter v${charter.version}) queried project_private_briefs and successfully received confidential brief. Access ALLOWED.`,
    };
    console.log(`[PASS] TEST 2: Accepted member granted access to confidential brief.\n`);
  } else {
    results["TEST 2"] = {
      pass: false,
      details: `FAILED: Student A was denied access or content mismatch: err=${memberErr?.message}, data=${JSON.stringify(memberBrief)}`,
    };
    console.error(`[FAIL] TEST 2: Accepted member could not access confidential brief!`);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: ledger chain = PASS
  // ---------------------------------------------------------------------------
  console.log("Executing TEST 3: ledger chain = PASS...");
  // Append 3 sequential production ledger entries
  const entry1 = await appendLedgerEntry(adminClient, {
    projectId: project.id,
    actorId: sponsor.id,
    action: "PROJECT_POSTED",
    entityType: "project",
    entityId: project.id,
    payload: { title: project.title, budget: 100000, sensitivity: "confidential" },
  });
  console.log(`  -> Entry 1 appended: Action=${entry1.action}, prev_hash=${entry1.prev_hash.slice(0, 10)}..., entry_hash=${entry1.entry_hash.slice(0, 10)}...`);

  const entry2 = await appendLedgerEntry(adminClient, {
    projectId: project.id,
    actorId: studentA.user.id,
    action: "CHARTER_ACCEPTED",
    entityType: "charter_acceptance",
    entityId: acceptance.id,
    payload: { charter_version: 1, user_role: "student" },
  });
  console.log(`  -> Entry 2 appended: Action=${entry2.action}, prev_hash=${entry2.prev_hash.slice(0, 10)}..., entry_hash=${entry2.entry_hash.slice(0, 10)}...`);

  const fakeContributionId = "00000000-0000-0000-0000-000000000001";
  const entry3 = await appendLedgerEntry(adminClient, {
    projectId: project.id,
    actorId: studentA.user.id,
    action: "CONTRIBUTION_SUBMITTED",
    entityType: "contribution",
    entityId: fakeContributionId,
    payload: { summary: "Preprocessing pipeline for edge fundus images", ai_assisted: true, ai_provider: "local" },
  });
  console.log(`  -> Entry 3 appended: Action=${entry3.action}, prev_hash=${entry3.prev_hash.slice(0, 10)}..., entry_hash=${entry3.entry_hash.slice(0, 10)}...`);

  // Verify the ledger chain
  const verifyResult = await verifyLedgerChain(adminClient, project.id);
  const isTest3Passed =
    verifyResult.status === "PASS" && verifyResult.entries_verified === 3;

  if (isTest3Passed) {
    results["TEST 3"] = {
      pass: true,
      details: `PASSED: Ledger chain verified 3 sequential entries from GENESIS with cryptographic SHA-256 integrity. Head Hash: ${verifyResult.head_hash}`,
    };
    console.log(`[PASS] TEST 3: Production ledger verification returned PASS (3/3 entries valid).\n`);
  } else {
    results["TEST 3"] = {
      pass: false,
      details: `FAILED: Verification status: ${verifyResult.status}, reason: ${verifyResult.reason}`,
    };
    console.error(`[FAIL] TEST 3: Ledger chain verification failed:`, verifyResult);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: UPDATE production ledger = BLOCKED
  // ---------------------------------------------------------------------------
  console.log("Executing TEST 4: UPDATE production ledger = BLOCKED...");
  let updateBlocked = false;
  let updateErrorMsg = "";
  try {
    const { error: updateErr } = await adminClient
      .from("ledger_entries")
      .update({ payload: { malicious_tamper: true } })
      .eq("id", entry1.id);

    if (updateErr) {
      updateBlocked = updateErr.message.includes("LEDGER_IMMUTABLE");
      updateErrorMsg = updateErr.message;
    }
  } catch (err: any) {
    updateBlocked = err.message.includes("LEDGER_IMMUTABLE");
    updateErrorMsg = err.message;
  }

  if (updateBlocked) {
    results["TEST 4"] = {
      pass: true,
      details: `PASSED: Direct UPDATE on production ledger raised exception '${updateErrorMsg}'. Modification BLOCKED.`,
    };
    console.log(`[PASS] TEST 4: UPDATE on production ledger was blocked by trigger.\n`);
  } else {
    results["TEST 4"] = {
      pass: false,
      details: `FAILED: UPDATE was not blocked! Error: ${updateErrorMsg}`,
    };
    console.error(`[FAIL] TEST 4: UPDATE on production ledger succeeded or gave unexpected error!`);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: DELETE production ledger = BLOCKED
  // ---------------------------------------------------------------------------
  console.log("Executing TEST 5: DELETE production ledger = BLOCKED...");
  let deleteBlocked = false;
  let deleteErrorMsg = "";
  try {
    const { error: deleteErr } = await adminClient
      .from("ledger_entries")
      .delete()
      .eq("id", entry2.id);

    if (deleteErr) {
      deleteBlocked = deleteErr.message.includes("LEDGER_IMMUTABLE");
      deleteErrorMsg = deleteErr.message;
    }
  } catch (err: any) {
    deleteBlocked = err.message.includes("LEDGER_IMMUTABLE");
    deleteErrorMsg = err.message;
  }

  if (deleteBlocked) {
    results["TEST 5"] = {
      pass: true,
      details: `PASSED: Direct DELETE on production ledger raised exception '${deleteErrorMsg}'. Deletion BLOCKED.`,
    };
    console.log(`[PASS] TEST 5: DELETE on production ledger was blocked by trigger.\n`);
  } else {
    results["TEST 5"] = {
      pass: false,
      details: `FAILED: DELETE was not blocked! Error: ${deleteErrorMsg}`,
    };
    console.error(`[FAIL] TEST 5: DELETE on production ledger succeeded or gave unexpected error!`);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: tampered copy = FAIL
  // ---------------------------------------------------------------------------
  console.log("Executing TEST 6: tampered copy = FAIL (Production ledger untouched)...");
  // Simulate tampering on an in-memory copy of entry 1
  const tamperResult = await simulateTamperLedger(adminClient, project.id, 1);

  // Check that tamper simulation caught the mismatch
  const detectedTamper =
    tamperResult.status === "FAIL" &&
    (tamperResult.reason === "ENTRY_HASH_MISMATCH" || tamperResult.reason === "PREV_HASH_MISMATCH") &&
    tamperResult.production_ledger_untouched === true;

  // Re-verify production ledger to prove it remains 100% untouched
  const prodCheck = await verifyLedgerChain(adminClient, project.id);
  const prodRemainsPass = prodCheck.status === "PASS" && prodCheck.entries_verified === 3;

  const isTest6Passed = detectedTamper && prodRemainsPass;

  if (isTest6Passed) {
    results["TEST 6"] = {
      pass: true,
      details: `PASSED: Tamper Lab safely copied chain, altered entry #1 payload, and detected '${tamperResult.reason}' at entry index ${tamperResult.detected_at_index} (entry ID: ${tamperResult.entry_id}). Production ledger was re-verified and remains 100% PASS (${prodCheck.entries_verified} entries).`,
    };
    console.log(`[PASS] TEST 6: Tampered copy failed verification with mismatch; production ledger remains untouched.\n`);
  } else {
    results["TEST 6"] = {
      pass: false,
      details: `FAILED: Tamper detection=${detectedTamper}, Production intact=${prodRemainsPass}`,
    };
    console.error(`[FAIL] TEST 6: Tamper simulation failed or damaged production ledger!`);
  }

  // Final Summary
  console.log("==================================================");
  console.log("SUMMARY OF M0 ARCHITECTURE KILL TESTS");
  console.log("==================================================");
  let allPass = true;
  for (const [testName, res] of Object.entries(results)) {
    const tag = res.pass ? "✓ PASS" : "✗ FAIL";
    console.log(`${tag} - ${testName}: ${res.details}`);
    if (!res.pass) allPass = false;
  }
  console.log("==================================================");

  if (!allPass) {
    console.error("\nM0 KILL TEST FAILED. Do not proceed to M1.");
    process.exit(1);
  } else {
    console.log("\nALL 6 M0 ARCHITECTURE KILL TESTS PASSED!");
    process.exit(0);
  }
}

runM0Suite().catch((err) => {
  console.error("Fatal error in test suite execution:", err);
  process.exit(1);
});

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { createAdminClient } from "../src/lib/supabase/server";

export async function cleanAllDemoData() {
  const adminClient = createAdminClient();
  const purgeAllUsers = process.argv.includes("--all");

  // 1. Get users from Auth
  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) throw listErr;

  const allUsers = usersData?.users || [];
  const targetUsers = purgeAllUsers
    ? allUsers
    : allUsers.filter(
        (u) =>
          u.email &&
          (u.email.endsWith("@gardenia.test") ||
            u.email.endsWith("@test.local") ||
            u.email.includes("_e2e_"))
      );

  console.log(`[CLEANUP] Found ${targetUsers.length} target accounts to purge (purgeAllUsers=${purgeAllUsers}).`);

  // 2. Delete application records from leaf tables
  const tablesToClear = [
    "project_feedback",
    "disputes",
    "credentials",
    "payouts",
    "escrows",
    "reviews",
    "contributions",
    "workspace_commits",
    "milestones",
    "agent_runs",
    "charter_acceptances",
    "charters",
    "project_private_ai_access",
    "project_private_briefs",
    "project_applications",
    "project_members",
    "notifications",
  ];

  for (const table of tablesToClear) {
    try {
      await adminClient.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log(`[CLEANUP] Cleared table: ${table}`);
    } catch {
      // some tables might use other primary keys
    }
  }

  // Handle projects if possible
  try {
    const { error } = await adminClient.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.log(`[CLEANUP] Note: Projects deletion requires running scripts/purge-database.sql in Supabase SQL Editor due to ledger immutability trigger.`);
    } else {
      console.log(`[CLEANUP] Cleared projects table.`);
    }
  } catch {
    // silent
  }

  // Delete target profiles and auth accounts
  for (const u of targetUsers) {
    try {
      await adminClient.from("profiles").delete().eq("id", u.id);
    } catch {
      // silent
    }
    try {
      const { error: delErr } = await adminClient.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.log(`[CLEANUP] Could not delete auth user ${u.email}: ${delErr.message}`);
      } else {
        console.log(`[CLEANUP] Deleted auth user: ${u.email}`);
      }
    } catch {
      // silent
    }
  }

  console.log(`[CLEANUP] Finished.`);
}

if (require.main === module) {
  cleanAllDemoData().catch(console.error);
}

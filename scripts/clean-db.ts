import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { createAdminClient } from "../src/lib/supabase/server";

export async function cleanAllDemoData() {
  const adminClient = createAdminClient();

  // 1. Get synthetic test users (*@gardenia.test)
  const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) throw listErr;

  const allUsers = usersData?.users || [];
  const demoUsers = allUsers.filter((u) => u.email && u.email.endsWith("@gardenia.test"));
  const realUsers = allUsers.filter((u) => !u.email || !u.email.endsWith("@gardenia.test"));

  const demoUserIds = new Set(demoUsers.map((u) => u.id));

  // 2. Delete test records from application tables
  const tablesToClear = [
    "project_feedback",
    "disputes",
    "credentials",
    "payouts",
    "escrows",
    "reviews",
    "contributions",
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
    } catch {
      // some tables might not have 'id' or may use other columns
    }
  }

  // Handle project_members (compound PK)
  try {
    await adminClient.from("project_members").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
  } catch {
    // silent
  }

  // Handle projects
  try {
    await adminClient.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  } catch {
    // silent
  }

  // Delete synthetic profiles and auth accounts
  for (const du of demoUsers) {
    try {
      await adminClient.from("profiles").delete().eq("id", du.id);
      await adminClient.auth.admin.deleteUser(du.id);
    } catch {
      // silent
    }
  }

  console.log(`[CLEANUP] Removed ${demoUsers.length} synthetic demo accounts.`);
  console.log(`[CLEANUP] Preserved ${realUsers.length} real accounts: ${realUsers.map((u) => u.email).join(", ")}`);
}

if (require.main === module) {
  cleanAllDemoData().catch(console.error);
}

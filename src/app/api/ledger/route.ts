import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    let query = admin
      .from("ledger_entries")
      .select(`
        id,
        project_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        payload,
        prev_hash,
        entry_hash,
        created_at,
        profiles:actor_id (
          display_name,
          role
        )
      `)
      .order("created_at", { ascending: true });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: entries, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: entries || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

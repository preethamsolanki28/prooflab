import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createScopedUserClient } from "@/lib/supabase/server";
import { appendLedgerEntry } from "@/lib/ledger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        {
          allowed: false,
          error: "Authentication required to access confidential research briefs.",
        },
        { status: 401 }
      );
    }

    // 1. Verify user identity
    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json(
        { allowed: false, error: "Invalid authentication session." },
        { status: 401 }
      );
    }

    // 2. Query project_private_briefs using Scoped User Client (Enforces Postgres RLS)
    const userClient = createScopedUserClient(token);
    const { data, error } = await userClient
      .from("project_private_briefs")
      .select("confidential_brief")
      .eq("project_id", id)
      .maybeSingle();

    if (error || !data || !data.confidential_brief) {
      // Access DENIED by RLS policy
      return NextResponse.json(
        {
          allowed: false,
          error: "ACCESS_DENIED_RLS: Confidential brief locked. You must accept the project charter to unlock.",
        },
        { status: 403 }
      );
    }

    // 3. User is authorized! Append PRIVATE_BRIEF_ACCESSED audit record into immutable ledger
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    try {
      await appendLedgerEntry(admin, {
        projectId: id,
        actorId: user.id,
        action: "PRIVATE_BRIEF_ACCESSED",
        entityType: "project_private_brief",
        entityId: id,
        payload: {
          viewer_name: profile?.display_name || "Unknown Member",
          viewer_role: profile?.role || "member",
          accessed_at: new Date().toISOString(),
        },
      });
    } catch (ledgerErr) {
      console.warn("Ledger logging warning on brief access:", ledgerErr);
    }

    // 4. Return unlocked brief
    return NextResponse.json({
      allowed: true,
      confidential_brief: data.confidential_brief,
      viewer: {
        id: user.id,
        name: profile?.display_name || user.email || "Researcher",
        role: profile?.role || "student",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

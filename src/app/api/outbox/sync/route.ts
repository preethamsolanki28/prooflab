import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncPendingAction } from "@/lib/outbox/sync";
import { PendingAction, SyncResult } from "@/lib/outbox/types";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authentication token" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid session token" },
        { status: 401 }
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const body = await req.json();
    const rawActions: PendingAction[] = Array.isArray(body.actions)
      ? body.actions
      : body.action
      ? [body.action]
      : [];

    if (rawActions.length === 0) {
      return NextResponse.json(
        { error: "Missing required 'action' or 'actions' in request body" },
        { status: 400 }
      );
    }

    const results: SyncResult[] = [];
    for (const action of rawActions) {
      const result = await syncPendingAction(admin, action, {
        id: user.id,
        email: user.email,
        displayName: profile?.display_name || user.email,
      });
      results.push(result);
    }

    const hasConflict = results.some((r) => r.status === "CONFLICT");

    return NextResponse.json({
      success: !hasConflict,
      results,
      syncedCount: results.filter((r) => r.status === "SYNCED").length,
      conflictCount: results.filter((r) => r.status === "CONFLICT").length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process outbox synchronization" },
      { status: 500 }
    );
  }
}

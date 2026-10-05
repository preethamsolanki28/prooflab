import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { appendLedgerEntry } from "@/lib/ledger";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { charterId, projectId, engagement_ack } = body;

    if (!charterId || !projectId) {
      return NextResponse.json({ error: "Missing required charterId or projectId" }, { status: 400 });
    }

    if (!engagement_ack) {
      return NextResponse.json(
        { error: "Explicit acknowledgement of the engagement model and charter terms is required." },
        { status: 400 }
      );
    }

    // 1. Fetch charter details
    const { data: charter, error: cErr } = await admin
      .from("charters")
      .select("id, version, engagement_model, budget")
      .eq("id", charterId)
      .single();

    if (cErr || !charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    // 2. Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    // 3. Check if user already accepted
    const { data: existing } = await admin
      .from("charter_acceptances")
      .select("*")
      .eq("charter_id", charterId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyAccepted: true,
        acceptance: existing,
        message: "Charter already accepted.",
      });
    }

    // 4. Insert into charter_acceptances (Database trigger on_charter_accepted updates project_members)
    const { data: acceptance, error: accErr } = await admin
      .from("charter_acceptances")
      .insert({
        charter_id: charterId,
        user_id: user.id,
        engagement_ack: true,
      })
      .select()
      .single();

    if (accErr || !acceptance) {
      return NextResponse.json(
        { error: `Failed to record charter acceptance: ${accErr?.message}` },
        { status: 500 }
      );
    }

    // 5. Append CHARTER_ACCEPTED into append-only cryptographic ledger
    await appendLedgerEntry(admin, {
      projectId,
      actorId: user.id,
      action: "CHARTER_ACCEPTED",
      entityType: "charter_acceptance",
      entityId: acceptance.id,
      payload: {
        charter_id: charterId,
        version: charter.version,
        engagement_model: charter.engagement_model,
        user_name: profile?.display_name || user.email,
        user_role: profile?.role || "student",
      },
    });

    return NextResponse.json({
      success: true,
      acceptance,
      message: "Charter accepted successfully. Team membership and confidential brief unlocked.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

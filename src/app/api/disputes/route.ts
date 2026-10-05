import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { openDispute, resolveDispute, getProjectDisputes } from "@/lib/disputes/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId parameter" }, { status: 400 });
    }

    const admin = createAdminClient();
    const disputes = await getProjectDisputes(admin, projectId);
    return NextResponse.json({ disputes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch disputes" }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: "Unauthorized: Invalid session token" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, contributionId, reason } = body;

    if (!projectId || !reason) {
      return NextResponse.json({ error: "Missing required fields: projectId, reason" }, { status: 400 });
    }

    const dispute = await openDispute(admin, {
      projectId,
      contributionId: contributionId || undefined,
      raisedBy: user.id, // STRICT: Derived from session
      reason,
    });

    return NextResponse.json({
      success: true,
      dispute,
      message: "Dispute opened and logged to cryptographic ledger.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to open dispute" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid session token" }, { status: 401 });
    }

    const body = await req.json();
    const { disputeId, resolution } = body;

    if (!disputeId || !resolution) {
      return NextResponse.json({ error: "Missing required fields: disputeId, resolution" }, { status: 400 });
    }

    const dispute = await resolveDispute(admin, {
      disputeId,
      resolvedBy: user.id, // STRICT: Derived from session
      resolution,
    });

    return NextResponse.json({
      success: true,
      dispute,
      message: "Dispute resolved and recorded to ledger.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to resolve dispute" }, { status: 500 });
  }
}

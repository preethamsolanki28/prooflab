import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getMilestoneEscrow,
  fundMilestoneEscrow,
  acceptMilestone,
  releaseMilestoneEscrow,
} from "@/lib/escrow/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { milestoneId } = await params;
    const admin = createAdminClient();
    const escrow = await getMilestoneEscrow(admin, milestoneId);
    return NextResponse.json({ escrow });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch escrow" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { milestoneId } = await params;
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
    const { action, amount } = body;

    if (action === "fund") {
      const escrow = await fundMilestoneEscrow(admin, {
        milestoneId,
        sponsorId: user.id, // STRICT: Derived from session
        amount: amount ? Number(amount) : undefined,
      });
      return NextResponse.json({
        success: true,
        action: "fund",
        escrow,
        message: "Milestone escrow funded successfully. Work may now begin.",
      });
    }

    if (action === "accept") {
      const milestone = await acceptMilestone(admin, {
        milestoneId,
        actorId: user.id, // STRICT: Derived from session
      });
      return NextResponse.json({
        success: true,
        action: "accept",
        milestone,
        message: "Milestone accepted by authorized reviewer.",
      });
    }

    if (action === "release") {
      const escrow = await releaseMilestoneEscrow(admin, {
        milestoneId,
        actorId: user.id, // STRICT: Derived from session
      });
      return NextResponse.json({
        success: true,
        action: "release",
        escrow,
        message: "Escrow funds released to contributors.",
      });
    }

    return NextResponse.json(
      { error: `Invalid action: ${action}. Expected 'fund', 'accept', or 'release'.` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process escrow action" }, { status: 500 });
  }
}

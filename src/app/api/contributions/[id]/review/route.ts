import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { submitReview } from "@/lib/contributions/review";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contributionId } = await params;
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

    // Role check: must be expert, sponsor, or admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["expert", "sponsor", "admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only experts, sponsors, or admins can review contributions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { quality, usefulness, evidence, impactScore, impact_score, decision, notes } = body;

    const chosenImpact = impactScore !== undefined ? Number(impactScore) : impact_score !== undefined ? Number(impact_score) : undefined;

    const result = await submitReview(admin, {
      contributionId,
      reviewerId: user.id, // STRICT: Derived from session
      impactScore: chosenImpact,
      quality: quality !== undefined ? Number(quality) : undefined,
      usefulness: usefulness !== undefined ? Number(usefulness) : undefined,
      evidence: evidence !== undefined ? Number(evidence) : undefined,
      decision,
      notes,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `Review recorded with decision: ${decision}. Impact score: ${result.review.impact_score}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit review" }, { status: 500 });
  }
}

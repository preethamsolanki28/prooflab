import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  calculateMilestoneRewards,
  HANDOUT_EXAMPLE_FIXTURE,
  ApprovedContributionItem,
} from "@/lib/rewards/calculator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const admin = createAdminClient();

    // 1. Fetch project details
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id, title, engagement_model, status")
      .eq("id", projectId)
      .single();

    if (pErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Fetch milestones & escrows
    const { data: milestones } = await admin
      .from("milestones")
      .select(`
        id,
        title,
        amount,
        status,
        escrows (*)
      `)
      .eq("project_id", projectId);

    // Calculate total project/milestone budget
    let totalMilestoneBudget = 0;
    for (const m of milestones || []) {
      totalMilestoneBudget += Number(m.amount || 0);
    }
    if (totalMilestoneBudget === 0) {
      totalMilestoneBudget = 57143; // Standard baseline for ₹40,000 student pool (40000 / 0.70)
    }

    // 3. Fetch all accepted contributions with reviews and profiles
    const { data: rawContributions } = await admin
      .from("contributions")
      .select(`
        id,
        title,
        owner_id,
        status,
        reviews (
          quality,
          usefulness,
          evidence,
          impact_score,
          decision
        )
      `)
      .eq("project_id", projectId)
      .eq("status", "accepted");

    // Fetch profile names
    const ownerIds = Array.from(new Set((rawContributions || []).map((c) => c.owner_id)));
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", ownerIds.length > 0 ? ownerIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name]));

    const approvedItems: ApprovedContributionItem[] = [];
    for (const c of rawContributions || []) {
      const approvedReview = Array.isArray(c.reviews)
        ? c.reviews.find((r: { decision: string }) => r.decision === "APPROVED")
        : null;

      if (approvedReview) {
        approvedItems.push({
          id: c.id,
          title: c.title,
          ownerId: c.owner_id,
          ownerName: profileMap.get(c.owner_id) || "Student Contributor",
          impactScore: Number(approvedReview.impact_score || 0),
          quality: approvedReview.quality,
          usefulness: approvedReview.usefulness,
          evidence: approvedReview.evidence,
        });
      }
    }

    // 4. Calculate deterministic reward distribution
    const rewardBreakdown = calculateMilestoneRewards({
      totalBudget: totalMilestoneBudget,
      approvedContributions: approvedItems,
      expertName: "Dr. Ananya (Domain Expert)",
    });

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        engagement_model: project.engagement_model,
      },
      milestones: milestones || [],
      rewards: rewardBreakdown,
      handoutFixture: HANDOUT_EXAMPLE_FIXTURE,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate rewards" }, { status: 500 });
  }
}

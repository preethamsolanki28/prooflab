// ==============================================================================
// Gardenia 2K26 — Milestone 3: Contribution Review & Research Credits
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { appendLedgerEntry } from "../ledger";
import { getUserResearchCredits } from "./service";

export interface ReviewContributionParams {
  contributionId: string;
  reviewerId: string; // STRICT: Derived from authenticated session
  impactScore?: number; // 1 to 5 (Simplified Model)
  quality?: number; // 0 to 2 (DB compatibility)
  usefulness?: number; // 0 to 2 (DB compatibility)
  evidence?: number; // 0 to 1 (DB compatibility)
  decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  notes?: string;
}

/**
 * Validates review scores.
 * Simplified system: Impact Score strictly 1–5.
 * Meaning:
 * 1 = Small contribution
 * 2 = Useful contribution
 * 3 = Solid contribution
 * 4 = High-impact contribution
 * 5 = Major contribution
 * Credits awarded = Impact Score.
 */
export function validateScores(
  quality?: number,
  usefulness?: number,
  evidence?: number,
  impactScore?: number,
  decision?: string
): { impactScore: number; quality: number; usefulness: number; evidence: number } {
  // If direct impactScore is provided (Simplified Model)
  if (impactScore !== undefined && impactScore !== null) {
    const rawScore = Number(impactScore);
    if (decision === "APPROVED") {
      if (!Number.isInteger(rawScore) || rawScore < 1 || rawScore > 5) {
        throw new Error("Impact score must be an integer between 1 and 5.");
      }
    } else {
      // For rejected / revision, impact is 0
      if (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 5) {
        throw new Error("Impact score must be an integer between 0 and 5.");
      }
    }

    const finalImpact = decision === "APPROVED" ? rawScore : 0;
    // Decompose into valid DB check constraints: quality (0-2), usefulness (0-2), evidence (0-1)
    const q = Math.min(2, Math.floor(finalImpact / 2));
    const u = Math.min(2, finalImpact - q);
    const e = Math.min(1, Math.max(0, finalImpact - q - u));

    return { impactScore: finalImpact, quality: q, usefulness: u, evidence: e };
  }

  // Fallback for legacy 3-category calls
  const q = Number(quality ?? 0);
  const u = Number(usefulness ?? 0);
  const e = Number(evidence ?? 0);

  if (!Number.isInteger(q) || q < 0 || q > 2) {
    throw new Error("Quality score must be an integer between 0 and 2.");
  }
  if (!Number.isInteger(u) || u < 0 || u > 2) {
    throw new Error("Usefulness score must be an integer between 0 and 2.");
  }
  if (!Number.isInteger(e) || e < 0 || e > 1) {
    throw new Error("Evidence score must be an integer between 0 and 1.");
  }

  const calculated = q + u + e;
  return { impactScore: calculated, quality: q, usefulness: u, evidence: e };
}

/**
 * Submits a formal review for a contribution.
 * If APPROVED:
 *   - Status is marked as 'accepted'
 *   - Contributor receives equivalent Research Credits
 *   - Ledger records CONTRIBUTION_REVIEWED and CREDITS_AWARDED
 * If REJECTED or NEEDS_REVISION:
 *   - Status is updated accordingly
 *   - Zero Research Credits awarded
 *   - Ledger records CONTRIBUTION_REVIEWED
 */
export async function submitReview(
  client: SupabaseClient,
  params: ReviewContributionParams
) {
  if (!["APPROVED", "REJECTED", "NEEDS_REVISION"].includes(params.decision)) {
    throw new Error(`Invalid review decision: ${params.decision}`);
  }

  // 1. Calculate and validate impact score (1-5 for simplified model)
  const { impactScore, quality, usefulness, evidence } = validateScores(
    params.quality,
    params.usefulness,
    params.evidence,
    params.impactScore,
    params.decision
  );

  // 2. Fetch the contribution
  const { data: contribution, error: cErr } = await client
    .from("contributions")
    .select("id, project_id, milestone_id, owner_id, title, status")
    .eq("id", params.contributionId)
    .single();

  if (cErr || !contribution) {
    throw new Error(`Contribution ${params.contributionId} not found.`);
  }

  // 3. Security invariant: Self-review strictly blocked
  if (contribution.owner_id === params.reviewerId) {
    throw new Error("SELF_REVIEW_BLOCKED: A contributor cannot review their own contribution.");
  }

  // 4. Insert into public.reviews
  const { data: review, error: rErr } = await client
    .from("reviews")
    .insert({
      contribution_id: params.contributionId,
      reviewer_id: params.reviewerId,
      quality,
      usefulness,
      evidence,
      impact_score: impactScore,
      decision: params.decision,
      notes: params.notes || null,
    })
    .select()
    .single();

  if (rErr || !review) {
    throw new Error(`Failed to record review: ${rErr?.message}`);
  }

  // 5. Update contribution status based on decision
  const newStatus =
    params.decision === "APPROVED"
      ? "accepted"
      : params.decision === "REJECTED"
      ? "rejected"
      : "needs_revision";

  const { data: updatedContribution, error: uErr } = await client
    .from("contributions")
    .update({ status: newStatus })
    .eq("id", params.contributionId)
    .select()
    .single();

  if (uErr) {
    throw new Error(`Failed to update contribution status: ${uErr.message}`);
  }

  // 6. Record append-only ledger event: CONTRIBUTION_REVIEWED
  await appendLedgerEntry(client, {
    projectId: contribution.project_id,
    actorId: params.reviewerId,
    action: "CONTRIBUTION_REVIEWED",
    entityType: "review",
    entityId: review.id,
    payload: {
      contribution_id: contribution.id,
      contribution_title: contribution.title,
      contributor_id: contribution.owner_id,
      impact_score: impactScore,
      decision: params.decision,
      notes: params.notes,
    },
  });

  // 7. If APPROVED, award server-side derived Research Credits (Credits = Impact Score)
  let creditsAwarded = 0;
  let newCreditTotal = 0;

  if (params.decision === "APPROVED") {
    creditsAwarded = impactScore;

    // Derive server-side total credits
    const creditSummary = await getUserResearchCredits(
      client,
      contribution.owner_id,
      contribution.project_id
    );
    newCreditTotal = creditSummary.totalCredits;

    // Record append-only ledger event: CREDITS_AWARDED
    await appendLedgerEntry(client, {
      projectId: contribution.project_id,
      actorId: params.reviewerId,
      action: "CREDITS_AWARDED",
      entityType: "contribution",
      entityId: contribution.id,
      payload: {
        contributor_id: contribution.owner_id,
        contribution_id: contribution.id,
        contribution_title: contribution.title,
        credits_awarded: creditsAwarded,
        total_research_credits: newCreditTotal,
        formula: `Credits = Impact Score (${impactScore}/5)`,
      },
    });

    // Notify contributor: Credits awarded
    await client.from("notifications").insert({
      user_id: contribution.owner_id,
      type: "CREDITS_APPROVED",
      title: "Contribution Approved & Credits Awarded!",
      message: `Your contribution "${contribution.title}" was approved with an Impact Score of ${impactScore}/5. You received +${creditsAwarded} Research Credits (New Balance: ${newCreditTotal} credits).`,
      project_id: contribution.project_id,
      related_user_id: params.reviewerId,
    });
  } else if (params.decision === "REJECTED") {
    await client.from("notifications").insert({
      user_id: contribution.owner_id,
      type: "EXPERT_REJECTED",
      title: "Contribution Not Accepted",
      message: `Your contribution "${contribution.title}" was reviewed and not accepted. Notes: ${params.notes || "Please check requirements."}`,
      project_id: contribution.project_id,
      related_user_id: params.reviewerId,
    });
  } else if (params.decision === "NEEDS_REVISION") {
    await client.from("notifications").insert({
      user_id: contribution.owner_id,
      type: "FEEDBACK_AVAILABLE",
      title: "Contribution Needs Revision",
      message: `Your contribution "${contribution.title}" requires revisions before approval. Notes: ${params.notes || "Please review feedback."}`,
      project_id: contribution.project_id,
      related_user_id: params.reviewerId,
    });
  }

  return {
    review,
    contribution: updatedContribution,
    creditsAwarded,
    newCreditTotal,
  };
}

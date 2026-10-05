// ==============================================================================
// Gardenia 2K26 — Milestone 3: Contribution Review & Research Credits
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { appendLedgerEntry } from "../ledger";
import { getUserResearchCredits } from "./service";

export interface ReviewContributionParams {
  contributionId: string;
  reviewerId: string; // STRICT: Derived from authenticated session
  quality: number; // 0 to 2
  usefulness: number; // 0 to 2
  evidence: number; // 0 to 1
  decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  notes?: string;
}

/**
 * Validates review scores according to rubric:
 * Quality: 0–2
 * Usefulness / impact: 0–2
 * Evidence / documentation: 0–1
 * Total impact_score: 0–5
 */
export function validateScores(quality: number, usefulness: number, evidence: number) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 2) {
    throw new Error("Quality score must be an integer between 0 and 2.");
  }
  if (!Number.isInteger(usefulness) || usefulness < 0 || usefulness > 2) {
    throw new Error("Usefulness score must be an integer between 0 and 2.");
  }
  if (!Number.isInteger(evidence) || evidence < 0 || evidence > 1) {
    throw new Error("Evidence score must be an integer between 0 and 1.");
  }
  return quality + usefulness + evidence;
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
  // 1. Calculate and validate impact score
  const impactScore = validateScores(params.quality, params.usefulness, params.evidence);

  if (!["APPROVED", "REJECTED", "NEEDS_REVISION"].includes(params.decision)) {
    throw new Error(`Invalid review decision: ${params.decision}`);
  }

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
      quality: params.quality,
      usefulness: params.usefulness,
      evidence: params.evidence,
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
      quality: params.quality,
      usefulness: params.usefulness,
      evidence: params.evidence,
      impact_score: impactScore,
      decision: params.decision,
      notes: params.notes,
    },
  });

  // 7. If APPROVED, award server-side derived Research Credits
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
      },
    });
  }

  return {
    review,
    contribution: updatedContribution,
    creditsAwarded,
    newCreditTotal,
  };
}

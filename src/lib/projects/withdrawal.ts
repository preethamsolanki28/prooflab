// ==============================================================================
// Gardenia 2K26 — Milestone 3: Sponsor Abandonment Protection
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { appendLedgerEntry } from "../ledger";

export interface WithdrawProjectParams {
  projectId: string;
  sponsorId: string; // STRICT: Derived from auth session
  reason?: string;
}

export interface WithdrawalResult {
  projectId: string;
  previousStatus: string;
  newStatus: string;
  acceptedContributionsCount: number;
  totalProtectedCredits: number;
  escrowStatus: string;
  message: string;
}

/**
 * Sponsor withdraws project.
 * Core Gardenia Governance Innovation:
 * - New work is STOPPED. Future contribution submissions are rejected.
 * - Accepted contribution records remain UNCHANGED.
 * - Derived Research Credits remain PROTECTED.
 * - Ledger history is APPEND-ONLY and immutable.
 */
export async function withdrawProject(
  client: SupabaseClient,
  params: WithdrawProjectParams
): Promise<WithdrawalResult> {
  // 1. Fetch project and verify sponsor ownership
  const { data: project, error: pErr } = await client
    .from("projects")
    .select("id, sponsor_id, status, title")
    .eq("id", params.projectId)
    .single();

  if (pErr || !project) {
    throw new Error(`Project ${params.projectId} not found.`);
  }

  // Check authorization: must be project sponsor or admin
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", params.sponsorId)
    .single();

  const isSponsor = project.sponsor_id === params.sponsorId;
  const isAdmin = profile?.role === "admin";

  if (!isSponsor && !isAdmin) {
    throw new Error("UNAUTHORIZED_WITHDRAWAL: Only the project sponsor or an admin can withdraw a project.");
  }

  if (project.status === "sponsor_withdrawn" || project.status === "work_stopped") {
    throw new Error("PROJECT_ALREADY_WITHDRAWN: This project has already been withdrawn.");
  }

  // 2. Count existing accepted contributions and their credits (to prove protection)
  const { data: acceptedContributions } = await client
    .from("contributions")
    .select(`
      id,
      reviews (
        impact_score,
        decision
      )
    `)
    .eq("project_id", params.projectId)
    .eq("status", "accepted");

  let totalProtectedCredits = 0;
  for (const c of acceptedContributions || []) {
    const approvedReview = Array.isArray(c.reviews)
      ? c.reviews.find((r: { decision: string }) => r.decision === "APPROVED")
      : null;
    if (approvedReview) {
      totalProtectedCredits += Number(approvedReview.impact_score || 0);
    }
  }

  // 3. Update project status: active -> sponsor_withdrawn
  const { error: uErr } = await client
    .from("projects")
    .update({ status: "sponsor_withdrawn" })
    .eq("id", params.projectId);

  if (uErr) {
    throw new Error(`Failed to update project status: ${uErr.message}`);
  }

  // 4. Update escrow state to PROTECTED if currently FUNDED
  const { data: escrows } = await client
    .from("escrows")
    .select("*")
    .eq("project_id", params.projectId);

  let currentEscrowStatus = "UNFUNDED";
  if (escrows && escrows.length > 0) {
    currentEscrowStatus = escrows[0].status;
    if (escrows[0].status === "FUNDED") {
      await client
        .from("escrows")
        .update({ status: "PROTECTED" })
        .eq("id", escrows[0].id);
      currentEscrowStatus = "PROTECTED";
    }
  }

  // 5. Append append-only ledger entry: PROJECT_WITHDRAWN
  await appendLedgerEntry(client, {
    projectId: params.projectId,
    actorId: params.sponsorId,
    action: "PROJECT_WITHDRAWN",
    entityType: "project",
    entityId: params.projectId,
    payload: {
      previous_status: project.status,
      new_status: "sponsor_withdrawn",
      work_status: "STOPPED",
      credits_status: "PROTECTED",
      accepted_contributions_preserved: (acceptedContributions || []).length,
      total_protected_credits: totalProtectedCredits,
      reason: params.reason || "Sponsor voluntary withdrawal under charter clause",
    },
  });

  return {
    projectId: params.projectId,
    previousStatus: project.status,
    newStatus: "sponsor_withdrawn",
    acceptedContributionsCount: (acceptedContributions || []).length,
    totalProtectedCredits,
    escrowStatus: currentEscrowStatus,
    message: "Project withdrawn. New work stopped. Accepted credits preserved.",
  };
}

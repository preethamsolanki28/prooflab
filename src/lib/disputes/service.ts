// ==============================================================================
// Gardenia 2K26 — Milestone 3: Dispute Resolution Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { appendLedgerEntry } from "../ledger";

export interface OpenDisputeParams {
  projectId: string;
  contributionId?: string;
  raisedBy: string; // STRICT: Derived from auth session
  reason: string;
  idempotencyId?: string;
}

export interface ResolveDisputeParams {
  disputeId: string;
  resolvedBy: string; // STRICT: Derived from auth session (Admin or Sponsor)
  resolution: string;
}

/**
 * Contributor opens a formal dispute regarding a review or reward calculation.
 * Creates DISPUTE_OPENED in the cryptographic ledger.
 */
export async function openDispute(
  client: SupabaseClient,
  params: OpenDisputeParams
) {
  if (!params.reason || params.reason.trim().length === 0) {
    throw new Error("Dispute reason is required.");
  }

  // Idempotency check: if an action with this idempotencyId was already committed, return it
  if (params.idempotencyId) {
    const { data: existing } = await client
      .from("disputes")
      .select("*")
      .eq("idempotency_id", params.idempotencyId)
      .maybeSingle();

    if (existing) {
      return existing;
    }
  }

  // 1. Insert into public.disputes
  const { data: dispute, error: dErr } = await client
    .from("disputes")
    .insert({
      project_id: params.projectId,
      contribution_id: params.contributionId || null,
      raised_by: params.raisedBy,
      reason: params.reason.trim(),
      idempotency_id: params.idempotencyId || null,
      status: "OPEN",
    })
    .select()
    .single();

  if (dErr || !dispute) {
    throw new Error(`Failed to open dispute: ${dErr?.message}`);
  }

  // 2. Append ledger event: DISPUTE_OPENED
  await appendLedgerEntry(client, {
    projectId: params.projectId,
    actorId: params.raisedBy,
    action: "DISPUTE_OPENED",
    entityType: "dispute",
    entityId: dispute.id,
    payload: {
      dispute_id: dispute.id,
      contribution_id: dispute.contribution_id,
      raised_by: params.raisedBy,
      reason: params.reason,
      status: "OPEN",
    },
  });

  return dispute;
}

/**
 * Admin (or project sponsor) resolves a dispute with formal resolution text.
 * Creates DISPUTE_RESOLVED in the cryptographic ledger.
 */
export async function resolveDispute(
  client: SupabaseClient,
  params: ResolveDisputeParams
) {
  if (!params.resolution || params.resolution.trim().length === 0) {
    throw new Error("Resolution text is required.");
  }

  // 1. Fetch dispute
  const { data: dispute, error: dErr } = await client
    .from("disputes")
    .select("id, project_id, raised_by, status")
    .eq("id", params.disputeId)
    .single();

  if (dErr || !dispute) {
    throw new Error(`Dispute ${params.disputeId} not found.`);
  }

  // Verify actor role: must be admin or project sponsor
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", params.resolvedBy)
    .single();

  const { data: project } = await client
    .from("projects")
    .select("sponsor_id")
    .eq("id", dispute.project_id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isSponsor = project?.sponsor_id === params.resolvedBy;

  if (!isAdmin && !isSponsor) {
    throw new Error("UNAUTHORIZED_DISPUTE_RESOLUTION: Only admins or project sponsors can resolve disputes.");
  }

  // 2. Update dispute status: OPEN -> RESOLVED
  const { data: updated, error: uErr } = await client
    .from("disputes")
    .update({
      status: "RESOLVED",
      resolution: params.resolution.trim(),
      resolved_by: params.resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", params.disputeId)
    .select()
    .single();

  if (uErr) {
    throw new Error(`Failed to resolve dispute: ${uErr.message}`);
  }

  // 3. Append ledger event: DISPUTE_RESOLVED
  await appendLedgerEntry(client, {
    projectId: dispute.project_id,
    actorId: params.resolvedBy,
    action: "DISPUTE_RESOLVED",
    entityType: "dispute",
    entityId: dispute.id,
    payload: {
      dispute_id: dispute.id,
      resolved_by: params.resolvedBy,
      resolution: params.resolution,
      previous_status: dispute.status,
      new_status: "RESOLVED",
    },
  });

  return updated;
}

/**
 * Fetch all disputes for a project.
 */
export async function getProjectDisputes(client: SupabaseClient, projectId: string) {
  const { data, error } = await client
    .from("disputes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

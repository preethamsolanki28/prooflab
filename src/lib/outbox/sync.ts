// ==============================================================================
// Gardenia 2K26 — Milestone 4: Server Outbox Synchronization & Governance
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { PendingAction, SyncResult, ContributionSubmissionPayload, DisputeSubmissionPayload } from "./types";
import { submitContribution } from "../contributions/service";
import { openDispute } from "../disputes/service";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  displayName?: string;
}

/**
 * Server-side synchronization endpoint logic:
 * Revalidates authenticated user, project status, charter version conflict, and idempotency.
 * The server is the authoritative truth — local storage is only a pending queue.
 */
export async function syncPendingAction(
  client: SupabaseClient,
  action: PendingAction,
  user: AuthenticatedUser
): Promise<SyncResult> {
  const { idempotencyId, actionType, projectId, charterVersion } = action;

  // 1. Fetch project status
  const { data: project, error: pErr } = await client
    .from("projects")
    .select("id, status, title")
    .eq("id", projectId)
    .single();

  if (pErr || !project) {
    return {
      idempotencyId,
      actionType,
      status: "CONFLICT",
      error: `Project ${projectId} not found on server.`,
    };
  }

  // Governance check: Project withdrawal blocks new work
  if (project.status === "sponsor_withdrawn" || project.status === "work_stopped") {
    return {
      idempotencyId,
      actionType,
      status: "CONFLICT",
      error: "PROJECT_WITHDRAWN: New contributions cannot be submitted to a withdrawn or stopped project.",
    };
  }

  // 2. Charter Version Conflict Check
  // If charter version changed while offline, reject with CONFLICT.
  const { data: latestCharter } = await client
    .from("charters")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentVersion = latestCharter?.version || 1;
  if (charterVersion < currentVersion) {
    return {
      idempotencyId,
      actionType,
      status: "CONFLICT",
      error: `Your submission was created under Charter v${charterVersion}. The project is now on Charter v${currentVersion}. Please review and resubmit.`,
    };
  }

  // 3. Process action type with idempotency
  if (actionType === "CONTRIBUTION_SUBMISSION") {
    // Idempotency check: see if contribution with idempotency_id already exists
    const { data: existingContrib } = await client
      .from("contributions")
      .select("id, status")
      .eq("idempotency_id", idempotencyId)
      .maybeSingle();

    if (existingContrib) {
      return {
        idempotencyId,
        actionType,
        status: "SYNCED",
        serverEntityId: existingContrib.id,
        alreadySynced: true,
        message: "Action already synchronized. Duplicate contribution avoided.",
      };
    }

    const payload = action.payload as unknown as ContributionSubmissionPayload;

    // Submit contribution server-side
    const contribution = await submitContribution(client, {
      projectId,
      milestoneId: payload.milestoneId,
      ownerId: user.id, // STRICT: Derived from authenticated session
      ownerName: user.displayName || user.email || "Student",
      title: payload.title,
      summary: payload.summary,
      contributionType: payload.contributionType || "code",
      aiAssisted: Boolean(payload.aiAssisted),
      aiProvider: payload.aiProvider || "none",
      idempotencyId,
    });

    return {
      idempotencyId,
      actionType,
      status: "SYNCED",
      serverEntityId: contribution.id,
      alreadySynced: false,
      message: "Contribution synchronized and anchored in ledger.",
    };
  }

  if (actionType === "DISPUTE_SUBMISSION") {
    // Idempotency check
    const { data: existingDispute } = await client
      .from("disputes")
      .select("id, status")
      .eq("idempotency_id", idempotencyId)
      .maybeSingle();

    if (existingDispute) {
      return {
        idempotencyId,
        actionType,
        status: "SYNCED",
        serverEntityId: existingDispute.id,
        alreadySynced: true,
        message: "Dispute already synchronized. Duplicate dispute avoided.",
      };
    }

    const payload = action.payload as unknown as DisputeSubmissionPayload;

    const dispute = await openDispute(client, {
      projectId,
      contributionId: payload.contributionId,
      raisedBy: user.id, // STRICT: Derived from session
      reason: payload.reason,
      idempotencyId,
    });

    return {
      idempotencyId,
      actionType,
      status: "SYNCED",
      serverEntityId: dispute.id,
      alreadySynced: false,
      message: "Dispute synchronized and anchored in ledger.",
    };
  }

  return {
    idempotencyId,
    actionType,
    status: "CONFLICT",
    error: `Unsupported action type: ${actionType}`,
  };
}

// ==============================================================================
// Gardenia 2K26 — Milestone 3: Escrow State Machine & Milestone Acceptance
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { appendLedgerEntry } from "../ledger";

export interface EscrowState {
  id?: string;
  projectId: string;
  milestoneId: string;
  amount: number;
  status: "UNFUNDED" | "FUNDED" | "RELEASED" | "PROTECTED";
  fundedAt?: string | null;
  releasedAt?: string | null;
}

/**
 * Retrieves the current escrow status for a given milestone.
 * Default is UNFUNDED if no escrow record exists yet.
 */
export async function getMilestoneEscrow(
  client: SupabaseClient,
  milestoneId: string
): Promise<EscrowState> {
  const { data: milestone, error: mErr } = await client
    .from("milestones")
    .select("id, project_id, amount, status")
    .eq("id", milestoneId)
    .single();

  if (mErr || !milestone) {
    throw new Error(`Milestone ${milestoneId} not found.`);
  }

  const { data: escrow } = await client
    .from("escrows")
    .select("*")
    .eq("milestone_id", milestoneId)
    .maybeSingle();

  if (!escrow) {
    return {
      projectId: milestone.project_id,
      milestoneId: milestone.id,
      amount: Number(milestone.amount || 0),
      status: "UNFUNDED",
      fundedAt: null,
      releasedAt: null,
    };
  }

  return {
    id: escrow.id,
    projectId: escrow.project_id,
    milestoneId: escrow.milestone_id,
    amount: Number(escrow.amount || 0),
    status: escrow.status,
    fundedAt: escrow.funded_at,
    releasedAt: escrow.released_at,
  };
}

/**
 * Sponsor funds the milestone escrow.
 * State transition: UNFUNDED -> FUNDED
 * Synthetic currency only (no real payment API).
 */
export async function fundMilestoneEscrow(
  client: SupabaseClient,
  params: {
    milestoneId: string;
    sponsorId: string; // STRICT: Derived from auth session
    amount?: number;
  }
) {
  // 1. Fetch milestone and verify project ownership
  const { data: milestone, error: mErr } = await client
    .from("milestones")
    .select(`
      id,
      project_id,
      amount,
      status,
      project:projects!milestones_project_id_fkey (id, sponsor_id, status)
    `)
    .eq("id", params.milestoneId)
    .single();

  if (mErr || !milestone) {
    throw new Error(`Milestone ${params.milestoneId} not found.`);
  }

  const project = milestone.project as unknown as { id: string; sponsor_id: string; status: string };

  // Verify actor is sponsor or admin
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", params.sponsorId)
    .single();

  const isSponsor = project.sponsor_id === params.sponsorId;
  const isAdmin = profile?.role === "admin";

  if (!isSponsor && !isAdmin) {
    throw new Error("UNAUTHORIZED_ESCROW_ACTION: Only the project sponsor or an admin can fund escrow.");
  }

  if (project.status === "sponsor_withdrawn") {
    throw new Error("Cannot fund milestone for a withdrawn project.");
  }

  const fundAmount = params.amount ?? Number(milestone.amount || 40000);

  // 2. Upsert escrow row
  const { data: escrow, error: eErr } = await client
    .from("escrows")
    .upsert(
      {
        project_id: project.id,
        milestone_id: milestone.id,
        amount: fundAmount,
        status: "FUNDED",
        funded_at: new Date().toISOString(),
      },
      { onConflict: "milestone_id" }
    )
    .select()
    .single();

  if (eErr || !escrow) {
    throw new Error(`Failed to fund escrow: ${eErr?.message}`);
  }

  // 3. Update milestone status to in_progress if currently open
  if (milestone.status === "open") {
    await client
      .from("milestones")
      .update({ status: "in_progress" })
      .eq("id", milestone.id);
  }

  // 4. Record ledger event: ESCROW_FUNDED
  await appendLedgerEntry(client, {
    projectId: project.id,
    actorId: params.sponsorId,
    action: "ESCROW_FUNDED",
    entityType: "escrow",
    entityId: escrow.id,
    payload: {
      milestone_id: milestone.id,
      amount: fundAmount,
      sponsor_id: params.sponsorId,
      status: "FUNDED",
    },
  });

  return escrow;
}

/**
 * Accepts a milestone.
 * Only authorized roles: sponsor, expert, or admin.
 * Students are strictly blocked.
 * State transition: SUBMITTED / IN_PROGRESS -> ACCEPTED
 */
export async function acceptMilestone(
  client: SupabaseClient,
  params: {
    milestoneId: string;
    actorId: string; // STRICT: Derived from auth session
  }
) {
  const { data: milestone, error: mErr } = await client
    .from("milestones")
    .select(`
      id,
      project_id,
      status,
      project:projects!milestones_project_id_fkey (id, sponsor_id)
    `)
    .eq("id", params.milestoneId)
    .single();

  if (mErr || !milestone) {
    throw new Error(`Milestone ${params.milestoneId} not found.`);
  }

  const project = milestone.project as unknown as { id: string; sponsor_id: string };

  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", params.actorId)
    .single();

  const isSponsor = project.sponsor_id === params.actorId;
  const isExpert = profile?.role === "expert";
  const isAdmin = profile?.role === "admin";

  if (!isSponsor && !isExpert && !isAdmin) {
    throw new Error("UNAUTHORIZED_ACCEPTANCE: Students cannot mark milestones as accepted.");
  }

  // Update milestone status to accepted
  const { data: updated, error: uErr } = await client
    .from("milestones")
    .update({ status: "accepted" })
    .eq("id", params.milestoneId)
    .select()
    .single();

  if (uErr) {
    throw new Error(`Failed to accept milestone: ${uErr.message}`);
  }

  // Record ledger event: MILESTONE_ACCEPTED
  await appendLedgerEntry(client, {
    projectId: project.id,
    actorId: params.actorId,
    action: "MILESTONE_ACCEPTED",
    entityType: "milestone",
    entityId: milestone.id,
    payload: {
      milestone_id: milestone.id,
      actor_id: params.actorId,
      actor_role: profile?.role || "sponsor",
      new_status: "accepted",
    },
  });

  return updated;
}

/**
 * Releases escrow funds after milestone acceptance.
 * Only sponsor or admin can release escrow.
 * Students are strictly blocked.
 * State transition: FUNDED -> RELEASED
 */
export async function releaseMilestoneEscrow(
  client: SupabaseClient,
  params: {
    milestoneId: string;
    actorId: string; // STRICT: Derived from auth session
  }
) {
  const { data: milestone, error: mErr } = await client
    .from("milestones")
    .select(`
      id,
      project_id,
      status,
      amount,
      project:projects!milestones_project_id_fkey (id, sponsor_id)
    `)
    .eq("id", params.milestoneId)
    .single();

  if (mErr || !milestone) {
    throw new Error(`Milestone ${params.milestoneId} not found.`);
  }

  const project = milestone.project as unknown as { id: string; sponsor_id: string };

  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", params.actorId)
    .single();

  const isSponsor = project.sponsor_id === params.actorId;
  const isAdmin = profile?.role === "admin";

  if (!isSponsor && !isAdmin) {
    throw new Error("UNAUTHORIZED_ESCROW_RELEASE: Students cannot release escrow.");
  }

  // Milestone must be accepted first
  if (milestone.status !== "accepted" && milestone.status !== "completed") {
    throw new Error(
      `Cannot release escrow: Milestone status is '${milestone.status}', must be 'accepted'.`
    );
  }

  // Escrow must be in FUNDED state
  const { data: escrow, error: eErr } = await client
    .from("escrows")
    .select("*")
    .eq("milestone_id", params.milestoneId)
    .single();

  if (eErr || !escrow || escrow.status !== "FUNDED") {
    throw new Error("Cannot release escrow: Escrow must be in FUNDED state.");
  }

  // Update escrow to RELEASED
  const { data: updatedEscrow, error: rErr } = await client
    .from("escrows")
    .update({
      status: "RELEASED",
      released_at: new Date().toISOString(),
    })
    .eq("id", escrow.id)
    .select()
    .single();

  if (rErr) {
    throw new Error(`Failed to release escrow: ${rErr.message}`);
  }

  // Record ledger event: ESCROW_RELEASED
  await appendLedgerEntry(client, {
    projectId: project.id,
    actorId: params.actorId,
    action: "ESCROW_RELEASED",
    entityType: "escrow",
    entityId: escrow.id,
    payload: {
      milestone_id: milestone.id,
      amount: escrow.amount,
      released_by: params.actorId,
      status: "RELEASED",
    },
  });

  return updatedEscrow;
}

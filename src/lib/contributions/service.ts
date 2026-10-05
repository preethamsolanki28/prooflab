// ==============================================================================
// Gardenia 2K26 — Milestone 3: Contribution Service
// ==============================================================================

import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { appendLedgerEntry } from "../ledger";

export interface SubmitContributionParams {
  projectId: string;
  milestoneId?: string;
  ownerId: string; // STRICT: Derived from authenticated session
  ownerName: string;
  title: string;
  summary: string;
  contributionType: "code" | "dataset" | "benchmark" | "paper" | "review" | "analysis";
  aiAssisted: boolean;
  aiProvider: "cloud" | "local" | "none" | "gemini";
  idempotencyId?: string;
}

/**
 * Server-side deterministic SHA-256 content hash calculation.
 * Never trust a client-supplied hash as authoritative truth.
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

/**
 * Submits a new contribution, enforces project active status, computes
 * content hash, and records CONTRIBUTION_SUBMITTED in the cryptographic ledger.
 */
export async function submitContribution(
  client: SupabaseClient,
  params: SubmitContributionParams
) {
  // 1. Verify project status (Sponsor withdrawal blocks new work)
  const { data: project, error: pErr } = await client
    .from("projects")
    .select("id, status, title")
    .eq("id", params.projectId)
    .single();

  if (pErr || !project) {
    throw new Error(`Project ${params.projectId} not found.`);
  }

  if (project.status === "sponsor_withdrawn" || project.status === "work_stopped") {
    throw new Error(
      "PROJECT_WITHDRAWN: New contributions cannot be submitted to a withdrawn or stopped project."
    );
  }

  // Idempotency check: if an action with this idempotencyId was already committed, return it
  if (params.idempotencyId) {
    const { data: existing } = await client
      .from("contributions")
      .select("*")
      .eq("idempotency_id", params.idempotencyId)
      .maybeSingle();

    if (existing) {
      return existing;
    }
  }

  // 2. Server-side calculate deterministic content hash
  const contentHash = calculateContentHash(`${params.title}\n\n${params.summary}`);

  // 3. Insert into public.contributions
  const { data: contribution, error: cErr } = await client
    .from("contributions")
    .insert({
      project_id: params.projectId,
      milestone_id: params.milestoneId || null,
      owner_id: params.ownerId,
      title: params.title,
      summary: params.summary,
      contribution_type: params.contributionType,
      content_hash: contentHash,
      ai_assisted: params.aiAssisted,
      ai_provider: params.aiProvider,
      idempotency_id: params.idempotencyId || null,
      status: "submitted",
    })
    .select()
    .single();

  if (cErr || !contribution) {
    throw new Error(`Failed to record contribution: ${cErr?.message}`);
  }

  // 4. Record append-only ledger entry: CONTRIBUTION_SUBMITTED
  await appendLedgerEntry(client, {
    projectId: params.projectId,
    actorId: params.ownerId,
    action: "CONTRIBUTION_SUBMITTED",
    entityType: "contribution",
    entityId: contribution.id,
    payload: {
      title: contribution.title,
      contribution_type: contribution.contribution_type,
      content_hash: contentHash,
      ai_assisted: contribution.ai_assisted,
      ai_provider: contribution.ai_provider,
      owner_name: params.ownerName,
      milestone_id: contribution.milestone_id,
    },
  });

  return contribution;
}

/**
 * Fetch all contributions for a project, optionally filtered by milestone.
 */
export async function getProjectContributions(
  client: SupabaseClient,
  projectId: string,
  milestoneId?: string
) {
  let query = client
    .from("contributions")
    .select(`
      *,
      owner:profiles!contributions_owner_id_fkey(id, display_name, role),
      reviews(*)
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (milestoneId) {
    query = query.eq("milestone_id", milestoneId);
  }

  const { data, error } = await query;
  if (error) {
    // If foreign key join fails due to PostgREST cache, fall back to simple select
    const { data: simpleData, error: sErr } = await client
      .from("contributions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (sErr) throw new Error(sErr.message);
    return simpleData || [];
  }

  return data || [];
}

/**
 * Server-side Research Credits query.
 * RULE: Credits are strictly derived from approved contribution impact scores.
 * The client cannot submit or mutate this balance.
 */
export async function getUserResearchCredits(
  client: SupabaseClient,
  userId: string,
  projectId?: string
) {
  // Query contributions owned by userId that are accepted
  let query = client
    .from("contributions")
    .select(`
      id,
      title,
      summary,
      contribution_type,
      content_hash,
      status,
      created_at,
      project_id,
      milestone_id,
      reviews (
        quality,
        usefulness,
        evidence,
        impact_score,
        decision,
        created_at
      )
    `)
    .eq("owner_id", userId)
    .eq("status", "accepted");

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data: contributions, error } = await query;
  if (error) {
    throw new Error(`Failed to calculate Research Credits: ${error.message}`);
  }

  let totalCredits = 0;
  const items: Array<{
    contributionId: string;
    title: string;
    impactScore: number;
    quality: number;
    usefulness: number;
    evidence: number;
    decision: string;
    projectId: string;
    createdAt: string;
  }> = [];

  for (const c of (contributions || [])) {
    const approvedReview = Array.isArray(c.reviews)
      ? c.reviews.find((r: { decision: string }) => r.decision === "APPROVED")
      : null;

    if (approvedReview) {
      const impact = Number(approvedReview.impact_score || 0);
      totalCredits += impact;
      items.push({
        contributionId: c.id,
        title: c.title,
        impactScore: impact,
        quality: approvedReview.quality,
        usefulness: approvedReview.usefulness,
        evidence: approvedReview.evidence,
        decision: approvedReview.decision,
        projectId: c.project_id,
        createdAt: c.created_at,
      });
    }
  }

  return {
    totalCredits,
    items,
  };
}

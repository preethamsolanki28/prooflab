// ==============================================================================
// Gardenia 2K26 — Milestone 3: Digital Credential Service (Non-Monetary Recognition)
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { appendLedgerEntry } from "../ledger";

export interface IssueCredentialParams {
  projectId: string;
  userId: string;
  contributionId?: string;
  title: string;
  actorId: string; // Sponsor or Admin
  metadata?: Record<string, unknown>;
}

/**
 * Issues a digital research credential / certificate of recognition.
 * Used for knowledge-sharing / non-monetary projects.
 * Guarantees zero monetary payout is created.
 */
export async function issueCredential(
  client: SupabaseClient,
  params: IssueCredentialParams
) {
  // 1. Fetch project and verify role
  const { data: project, error: pErr } = await client
    .from("projects")
    .select("id, title, sponsor_id, engagement_model")
    .eq("id", params.projectId)
    .single();

  if (pErr || !project) {
    throw new Error(`Project ${params.projectId} not found.`);
  }

  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", params.actorId)
    .single();

  const isSponsor = project.sponsor_id === params.actorId;
  const isAdmin = profile?.role === "admin";

  if (!isSponsor && !isAdmin) {
    throw new Error("UNAUTHORIZED_CREDENTIAL_ISSUANCE: Only sponsor or admin can issue credentials.");
  }

  // Fetch contributor profile
  const { data: recipient } = await client
    .from("profiles")
    .select("display_name")
    .eq("id", params.userId)
    .single();

  const recipientName = recipient?.display_name || "Contributor";

  // 2. Insert into public.credentials
  const credentialMetadata = {
    contributor_name: recipientName,
    project_title: project.title,
    engagement_model: project.engagement_model,
    monetary_payout: false,
    payout_amount: 0,
    issued_by: params.actorId,
    ...(params.metadata || {}),
  };

  const { data: credential, error: cErr } = await client
    .from("credentials")
    .insert({
      project_id: params.projectId,
      user_id: params.userId,
      type: "research_credit",
      title: params.title,
      metadata: credentialMetadata,
    })
    .select()
    .single();

  if (cErr || !credential) {
    throw new Error(`Failed to issue credential: ${cErr?.message}`);
  }

  // 3. Append ledger event: CREDENTIAL_ISSUED
  await appendLedgerEntry(client, {
    projectId: params.projectId,
    actorId: params.actorId,
    action: "CREDENTIAL_ISSUED",
    entityType: "credential",
    entityId: credential.id,
    payload: {
      credential_id: credential.id,
      recipient_id: params.userId,
      recipient_name: recipientName,
      title: params.title,
      project_id: params.projectId,
      monetary_payout: false,
      amount: 0,
    },
  });

  return credential;
}

/**
 * Fetch credentials issued for a project or user.
 */
export async function getCredentials(
  client: SupabaseClient,
  filter: { projectId?: string; userId?: string }
) {
  let query = client.from("credentials").select("*");

  if (filter.projectId) {
    query = query.eq("project_id", filter.projectId);
  }
  if (filter.userId) {
    query = query.eq("user_id", filter.userId);
  }

  const { data, error } = await query.order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

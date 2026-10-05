import { SupabaseClient } from "@supabase/supabase-js";

export interface LedgerEntry {
  id: string;
  project_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  entry_hash: string;
  created_at: string;
}

export interface VerificationResult {
  status: "PASS" | "FAIL" | "ERROR";
  reason?: string;
  entry_id?: string;
  expected_prev_hash?: string;
  actual_prev_hash?: string;
  expected_hash?: string;
  actual_hash?: string;
  entry_index?: number;
  entries_verified?: number;
  head_hash?: string;
  tampered_entry_index?: number;
  detected_at_index?: number;
  production_ledger_untouched?: boolean;
}

/**
 * Appends a new entry to the immutable ledger via the DB security-definer function.
 * All writes go through this function to guarantee correct hash chaining.
 */
export async function appendLedgerEntry(
  client: SupabaseClient,
  params: {
    projectId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }
): Promise<LedgerEntry> {
  const { data, error } = await client.rpc("append_ledger_entry", {
    p_project_id: params.projectId,
    p_actor_id: params.actorId,
    p_action: params.action,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId,
    p_payload: params.payload,
  });

  if (error) {
    throw new Error(`Failed to append ledger entry: ${error.message}`);
  }

  return data as LedgerEntry;
}

/**
 * Verifies the production ledger chain for a given project from genesis to head.
 * Returns PASS or FAIL with the first mismatched entry.
 */
export async function verifyLedgerChain(
  client: SupabaseClient,
  projectId: string
): Promise<VerificationResult> {
  const { data, error } = await client.rpc("verify_ledger_chain", {
    p_project_id: projectId,
  });

  if (error) {
    throw new Error(`Failed to verify ledger chain: ${error.message}`);
  }

  return data as VerificationResult;
}

/**
 * Safe Tamper Lab simulator.
 * Copies the ledger chain into memory, alters one historical payload,
 * runs verification on the copy, and proves the mismatch is caught.
 * The production ledger remains untouched.
 */
export async function simulateTamperLedger(
  client: SupabaseClient,
  projectId: string,
  tamperIndex: number = 1
): Promise<VerificationResult> {
  const { data, error } = await client.rpc("simulate_tamper_ledger", {
    p_project_id: projectId,
    p_tamper_index: tamperIndex,
  });

  if (error) {
    throw new Error(`Tamper lab simulation error: ${error.message}`);
  }

  return data as VerificationResult;
}

// ==============================================================================
// Gardenia 2K26 — Milestone 4: Local Pending-Action Outbox Types
// ==============================================================================

export type OutboxActionType = "CONTRIBUTION_SUBMISSION" | "DISPUTE_SUBMISSION";

export type OutboxActionStatus = "PENDING" | "SYNCED" | "CONFLICT";

export interface PendingAction<T = Record<string, unknown>> {
  idempotencyId: string;
  actionType: OutboxActionType;
  projectId: string;
  charterVersion: number;
  payload: T;
  createdAt: string;
  status: OutboxActionStatus;
  error?: string;
  serverEntityId?: string;
}

export interface ContributionSubmissionPayload {
  milestoneId?: string;
  title: string;
  summary: string;
  contributionType: "code" | "dataset" | "benchmark" | "paper" | "review" | "analysis";
  aiAssisted: boolean;
  aiProvider: "cloud" | "local" | "none" | "gemini";
}

export interface DisputeSubmissionPayload {
  contributionId?: string;
  reason: string;
}

export interface SyncResult {
  idempotencyId: string;
  actionType: OutboxActionType;
  status: "SYNCED" | "CONFLICT";
  serverEntityId?: string;
  alreadySynced?: boolean;
  error?: string;
  message?: string;
}

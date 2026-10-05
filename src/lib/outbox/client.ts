// ==============================================================================
// Gardenia 2K26 — Milestone 4: Browser Local Outbox Client
// ==============================================================================

import { PendingAction, OutboxActionStatus } from "./types";

const OUTBOX_STORAGE_KEY = "gardenia_pending_actions_v1";

// In-memory fallback for SSR or testing environments
const memoryOutbox = new Map<string, PendingAction>();

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Loads all pending actions from local storage or memory.
 */
export function getAllPendingActions(): PendingAction[] {
  if (!isLocalStorageAvailable()) {
    return Array.from(memoryOutbox.values());
  }

  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read from local outbox:", err);
    return [];
  }
}

/**
 * Persists all pending actions to storage.
 */
function persistActions(actions: PendingAction[]): void {
  if (!isLocalStorageAvailable()) {
    memoryOutbox.clear();
    for (const a of actions) {
      memoryOutbox.set(a.idempotencyId, a);
    }
    return;
  }

  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(actions));
  } catch (err) {
    console.error("Failed to persist local outbox:", err);
  }
}

/**
 * Enqueues a new pending action with PENDING status.
 */
export function savePendingAction(action: Omit<PendingAction, "status" | "createdAt">): PendingAction {
  const fullAction: PendingAction = {
    ...action,
    createdAt: new Date().toISOString(),
    status: "PENDING",
  };

  const actions = getAllPendingActions();
  const existingIdx = actions.findIndex((a) => a.idempotencyId === fullAction.idempotencyId);
  if (existingIdx >= 0) {
    actions[existingIdx] = fullAction;
  } else {
    actions.push(fullAction);
  }

  persistActions(actions);
  return fullAction;
}

/**
 * Retrieves pending actions, optionally filtered by project ID and status.
 */
export function getPendingActions(projectId?: string, status?: OutboxActionStatus): PendingAction[] {
  let actions = getAllPendingActions();
  if (projectId) {
    actions = actions.filter((a) => a.projectId === projectId);
  }
  if (status) {
    actions = actions.filter((a) => a.status === status);
  }
  return actions;
}

/**
 * Marks an action as SYNCED upon server acceptance.
 */
export function markActionSynced(idempotencyId: string, serverEntityId?: string): void {
  const actions = getAllPendingActions();
  const target = actions.find((a) => a.idempotencyId === idempotencyId);
  if (target) {
    target.status = "SYNCED";
    if (serverEntityId) target.serverEntityId = serverEntityId;
    persistActions(actions);
  }
}

/**
 * Marks an action as CONFLICT (e.g. charter version changed while offline).
 */
export function markActionConflict(idempotencyId: string, error: string): void {
  const actions = getAllPendingActions();
  const target = actions.find((a) => a.idempotencyId === idempotencyId);
  if (target) {
    target.status = "CONFLICT";
    target.error = error;
    persistActions(actions);
  }
}

/**
 * Removes a specific pending action from the local queue.
 */
export function removePendingAction(idempotencyId: string): void {
  const actions = getAllPendingActions().filter((a) => a.idempotencyId !== idempotencyId);
  persistActions(actions);
}

/**
 * Clears the local outbox.
 */
export function clearOutbox(): void {
  if (isLocalStorageAvailable()) {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  }
  memoryOutbox.clear();
}

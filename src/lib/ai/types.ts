// ==============================================================================
// Gardenia 2K26 — AI Data-Classification & Routing Types
// ==============================================================================

export type DataClassification = "PUBLIC" | "CONFIDENTIAL" | "MIXED" | "UNKNOWN";

export type AiProvider = "gemini" | "local";

export type AiRouteStatus =
  | "SUCCESS"
  | "LOCAL_AI_UNAVAILABLE"
  | "CLOUD_FALLBACK_USED"
  | "ERROR";

export type RouteBadge =
  | "PUBLIC DATA → CLOUD AI"
  | "CONFIDENTIAL DATA → LOCAL AI";

export interface AiRoutingDecision {
  classification: DataClassification;
  allowedProvider: AiProvider;
  cloudAllowed: boolean;
  routeBadge: RouteBadge;
}

export interface AiRouteResult {
  provider: AiProvider;
  classification: DataClassification;
  output: string;
  status: AiRouteStatus;
  routeBadge: RouteBadge;
  telemetrySafe: boolean; // Must be true: certifies no confidential prompt transmitted to cloud
  latencyMs: number;
  model: string;
  error?: string;
}

export interface AiRequestOptions {
  prompt: string;
  classification: DataClassification;
  systemPrompt?: string;
  localBaseUrl?: string;
  localModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

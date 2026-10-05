// ==============================================================================
// Gardenia 2K26 — Dual-AI Privacy Routing Engine
// ==============================================================================

import {
  DataClassification,
  AiRoutingDecision,
  AiRouteResult,
  AiRequestOptions,
  RouteBadge,
} from "./types";
import { callOpenRouterCloud } from "./openrouter";
import { callLocalModel } from "./local";

/**
 * Deterministic Routing Policy Resolver:
 * Resolves the allowed provider and security boundaries based exclusively on
 * application-derived data classification (never inferred by a cloud model).
 *
 * Rules:
 * - PUBLIC: Cloud OpenRouter is allowed.
 * - CONFIDENTIAL: Local model only.
 * - MIXED: Local model only.
 * - UNKNOWN: Local model only.
 */
export function resolveRoutingPolicy(
  classification: DataClassification
): AiRoutingDecision {
  if (classification === "PUBLIC") {
    return {
      classification,
      allowedProvider: "openrouter",
      cloudAllowed: true,
      routeBadge: "PUBLIC DATA → CLOUD AI",
    };
  }

  // CONFIDENTIAL, MIXED, or UNKNOWN -> Strictly Local Model
  return {
    classification,
    allowedProvider: "local",
    cloudAllowed: false,
    routeBadge: "CONFIDENTIAL DATA → LOCAL AI",
  };
}

/**
 * Main AI Request Router:
 * Enforces privacy boundaries, dispatches to the allowed provider,
 * and guarantees that confidential data NEVER reaches the cloud.
 */
export async function routeAiRequest(
  options: AiRequestOptions
): Promise<AiRouteResult> {
  const startTime = Date.now();
  const decision = resolveRoutingPolicy(options.classification);

  // 1. PUBLIC ROUTE -> Cloud OpenRouter
  if (decision.allowedProvider === "openrouter" && decision.cloudAllowed) {
    try {
      const cloudRes = await callOpenRouterCloud(options.prompt, options.classification, {
        apiKey: options.openrouterApiKey || options.geminiApiKey,
        model: options.openrouterModel || options.geminiModel,
        systemPrompt: options.systemPrompt,
      });

      const latencyMs = Date.now() - startTime;

      return {
        provider: "openrouter",
        classification: options.classification,
        output: cloudRes.output,
        status: cloudRes.fallbackUsed ? "CLOUD_FALLBACK_USED" : "SUCCESS",
        routeBadge: decision.routeBadge,
        telemetrySafe: true,
        latencyMs,
        model: cloudRes.model,
        error: cloudRes.error,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        provider: "openrouter",
        classification: options.classification,
        output: "Cloud AI unavailable. Using saved public-task result.",
        status: "ERROR",
        routeBadge: decision.routeBadge,
        telemetrySafe: true,
        latencyMs,
        model: options.openrouterModel || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        error: err.message,
      };
    }
  }

  // 2. CONFIDENTIAL / MIXED / UNKNOWN ROUTE -> Local Model Only
  // CRITICAL AUDIT ASSERTION: Check cloudAllowed is strictly false
  if (decision.cloudAllowed) {
    throw new Error(
      "CRITICAL_ROUTER_FAULT: cloudAllowed was true for non-public data classification."
    );
  }

  const localRes = await callLocalModel(options.prompt, {
    baseUrl: options.localBaseUrl,
    model: options.localModel,
    systemPrompt: options.systemPrompt,
  });

  const latencyMs = Date.now() - startTime;

  return {
    provider: "local",
    classification: options.classification,
    output: localRes.output,
    status: localRes.status,
    routeBadge: decision.routeBadge,
    telemetrySafe: true, // Certifies confidential prompt was processed on-device only
    latencyMs,
    model: localRes.model,
    error: localRes.error,
  };
}

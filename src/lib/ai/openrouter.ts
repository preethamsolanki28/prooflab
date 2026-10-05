// ==============================================================================
// Gardenia 2K26 — OpenRouter Cloud AI Adapter (For Public Data Only)
// ==============================================================================

import { DataClassification } from "./types";

const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

export interface OpenRouterResponse {
  output: string;
  model: string;
  fallbackUsed: boolean;
  error?: string;
}

/**
 * Deterministic fallback for public tasks when Cloud OpenRouter is unavailable.
 */
function getDeterministicPublicFallback(prompt: string): string {
  return [
    "Cloud AI unavailable. Using saved public-task result.",
    "",
    "PUBLIC PROJECT MILESTONES (Cached Deterministic Fallback):",
    "1. Milestone 1: Data Preprocessing & Edge Architecture Setup - Clean input dataset, normalize images, and establish baseline inference pipeline on target edge constraints.",
    "2. Milestone 2: Evaluation, Clinical Metric Validation & Documentation - Benchmark precision/recall on validation cohort and deliver reproduction report.",
    `[Source Prompt Hash: ${Buffer.from(prompt.slice(0, 32)).toString("hex")}]`,
  ].join("\n");
}

/**
 * Executes Cloud OpenRouter request for PUBLIC data only.
 * Throws immediately if data classification is NOT PUBLIC.
 */
export async function callOpenRouterCloud(
  prompt: string,
  classification: DataClassification,
  options?: {
    apiKey?: string;
    model?: string;
    systemPrompt?: string;
  }
): Promise<OpenRouterResponse> {
  // CRITICAL SECURITY ENFORCEMENT: Never send confidential data to cloud
  if (classification !== "PUBLIC") {
    throw new Error(
      `SECURITY_VIOLATION: Attempted to send ${classification} data to Cloud OpenRouter API. This is strictly prohibited by data governance policy.`
    );
  }

  const apiKey = options?.apiKey || process.env.OPENROUTER_API_KEY;
  const model = options?.model || DEFAULT_OPENROUTER_MODEL;

  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY is not configured; using deterministic public fallback.");
    return {
      output: getDeterministicPublicFallback(prompt),
      model: `${model} (fallback)`,
      fallbackUsed: true,
      error: "MISSING_OPENROUTER_API_KEY",
    };
  }

  const url = "https://openrouter.ai/api/v1/chat/completions";

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (options?.systemPrompt) {
    messages.push({
      role: "system",
      content: options.systemPrompt,
    });
  }
  messages.push({
    role: "user",
    content: prompt,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://gardenia.research",
        "X-Title": "Gardenia 2K26 Research Ecosystem",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`OpenRouter API returned status ${res.status}: ${errText}`);
      return {
        output: getDeterministicPublicFallback(prompt),
        model: `${model} (fallback)`,
        fallbackUsed: true,
        error: `HTTP_${res.status}: ${errText}`,
      };
    }

    const data = await res.json();
    const candidateText =
      data.choices?.[0]?.message?.content || "";

    if (!candidateText) {
      return {
        output: getDeterministicPublicFallback(prompt),
        model: `${model} (fallback)`,
        fallbackUsed: true,
        error: "EMPTY_CANDIDATE_RESPONSE",
      };
    }

    return {
      output: candidateText.trim(),
      model,
      fallbackUsed: false,
    };
  } catch (err: any) {
    console.warn(`OpenRouter network call failed: ${err.message}; using deterministic public fallback.`);
    return {
      output: getDeterministicPublicFallback(prompt),
      model: `${model} (fallback)`,
      fallbackUsed: true,
      error: err.message,
    };
  }
}

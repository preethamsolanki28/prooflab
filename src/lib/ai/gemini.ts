import { DataClassification } from "./types";

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export interface GeminiResponse {
  output: string;
  model: string;
  fallbackUsed: boolean;
  error?: string;
}

/**
 * Deterministic fallback for public tasks when Cloud Gemini is unavailable.
 */
function getDeterministicPublicFallback(prompt: string): string {
  return [
    "PUBLIC PROJECT MILESTONES (Cached Deterministic Fallback):",
    "1. Milestone 1: Data Preprocessing & Edge Architecture Setup - Clean input dataset, normalize images, and establish baseline inference pipeline on target edge constraints.",
    "2. Milestone 2: Evaluation, Clinical Metric Validation & Documentation - Benchmark precision/recall on validation cohort and deliver reproduction report.",
    `[Source Prompt Hash: ${Buffer.from(prompt.slice(0, 32)).toString("hex")}]`,
  ].join("\n");
}

/**
 * Executes Cloud Gemini request for PUBLIC data only.
 * Throws immediately if data classification is NOT PUBLIC.
 */
export async function callGeminiCloud(
  prompt: string,
  classification: DataClassification,
  options?: {
    apiKey?: string;
    model?: string;
    systemPrompt?: string;
  }
): Promise<GeminiResponse> {
  // CRITICAL SECURITY ENFORCEMENT: Never send confidential data to cloud
  if (classification !== "PUBLIC") {
    throw new Error(
      `SECURITY_VIOLATION: Attempted to send ${classification} data to Cloud Gemini API. This is strictly prohibited by data governance policy.`
    );
  }

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
  const model = options?.model || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured; using deterministic public fallback.");
    return {
      output: getDeterministicPublicFallback(prompt),
      model: `${model} (fallback)`,
      fallbackUsed: true,
      error: "MISSING_GEMINI_API_KEY",
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents: any[] = [];
  if (options?.systemPrompt) {
    contents.push({
      role: "user",
      parts: [{ text: `System Instructions: ${options.systemPrompt}` }],
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  try {
    let res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    // If 503 high demand spike, retry once after 1.5 seconds
    if (res.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Gemini API returned status ${res.status}: ${errText}`);
      return {
        output: getDeterministicPublicFallback(prompt),
        model: `${model} (fallback)`,
        fallbackUsed: true,
        error: `HTTP_${res.status}: ${errText}`,
      };
    }

    const data = await res.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
    console.warn(`Gemini network call failed: ${err.message}; using deterministic public fallback.`);
    return {
      output: getDeterministicPublicFallback(prompt),
      model: `${model} (fallback)`,
      fallbackUsed: true,
      error: err.message,
    };
  }
}

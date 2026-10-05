// ==============================================================================
// Gardenia 2K26 — Local Model Adapter (Pluggable Local Inference Endpoint)
// ==============================================================================

const DEFAULT_LOCAL_BASE_URL =
  process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434";
const DEFAULT_LOCAL_MODEL =
  process.env.LOCAL_LLM_MODEL || "smollm2:135m";

export interface LocalModelResponse {
  output: string;
  model: string;
  status: "SUCCESS" | "LOCAL_AI_UNAVAILABLE";
  error?: string;
}

/**
 * Deterministic local fallback when local model runtime is unavailable.
 * Guarantees zero cloud data leakage while keeping the application responsive.
 */
export function getDeterministicLocalFallback(prompt: string): string {
  // Extract brief snippet for context without storing or leaking
  const safeExcerpt = prompt.slice(0, 60).replace(/[\r\n]+/g, " ");

  return [
    "CONFIDENTIAL RESEARCH WORKSPACE (Deterministic Local Fallback):",
    `• Context: "${safeExcerpt}..."`,
    "• Privacy Status: SAFEGUARD ACTIVE. Data processed entirely on-device; zero cloud transmission.",
    "• Recommended Protocol: Proceed with on-device evaluation; verify local dataset integrity according to accepted Charter terms.",
    "• Security Notice: Local model runtime is unavailable. Confidential input was NOT sent to any cloud provider.",
  ].join("\n");
}

/**
 * Calls local model runtime (Ollama or compatible HTTP endpoint).
 * If unavailable, fails closed to deterministic local fallback.
 * NEVER routes to cloud.
 */
export async function callLocalModel(
  prompt: string,
  options?: {
    baseUrl?: string;
    model?: string;
    systemPrompt?: string;
    timeoutMs?: number;
  }
): Promise<LocalModelResponse> {
  const baseUrl = options?.baseUrl || DEFAULT_LOCAL_BASE_URL;
  const model = options?.model || DEFAULT_LOCAL_MODEL;
  const timeoutMs = options?.timeoutMs || 8000;

  const url = `${baseUrl.replace(/\/+$/, "")}/api/generate`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        system: options?.systemPrompt || "You are an on-device confidential research assistant.",
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        output: getDeterministicLocalFallback(prompt),
        model: `${model} (fallback)`,
        status: "LOCAL_AI_UNAVAILABLE",
        error: `HTTP_${res.status}: ${errText}`,
      };
    }

    const data = await res.json();
    const responseText = data.response?.trim();

    if (!responseText) {
      return {
        output: getDeterministicLocalFallback(prompt),
        model: `${model} (fallback)`,
        status: "LOCAL_AI_UNAVAILABLE",
        error: "EMPTY_LOCAL_RESPONSE",
      };
    }

    return {
      output: responseText,
      model,
      status: "SUCCESS",
    };
  } catch (err: any) {
    clearTimeout(timer);
    const isAbort = err.name === "AbortError";
    const errorMsg = isAbort ? `Local model timed out after ${timeoutMs}ms` : err.message;

    return {
      output: getDeterministicLocalFallback(prompt),
      model: `${model} (fallback)`,
      status: "LOCAL_AI_UNAVAILABLE",
      error: errorMsg,
    };
  }
}

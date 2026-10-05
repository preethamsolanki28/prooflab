// ==============================================================================
// Gardenia 2K26 — Milestone 2: AI Project Scoping Layer
// ==============================================================================

import { z } from "zod";
import { routeAiRequest } from "./router";
import { DataClassification, AiProvider } from "./types";

export const MilestoneSchema = z.object({
  title: z.string().min(1, "Milestone title is required"),
  description: z.string().min(1, "Milestone description is required"),
  required_skills: z.array(z.string()).min(1, "At least one skill is required"),
  acceptance_criteria: z.array(z.string()).min(1, "At least one acceptance criterion is required"),
});

export const ScopingResultSchema = z.object({
  milestones: z.array(MilestoneSchema).length(2, "Exactly 2 milestones must be generated"),
});

export type MilestoneDef = z.infer<typeof MilestoneSchema>;
export type ScopingResult = z.infer<typeof ScopingResultSchema>;

export interface ScopingExecutionResponse {
  result: ScopingResult;
  aiProvider: AiProvider;
  dataClassification: DataClassification;
  fallbackUsed: boolean;
  routeBadge: string;
  status: string;
  latencyMs: number;
}

/**
 * Deterministic fallback for the seeded diabetic-retinopathy and generic projects.
 * Guaranteed to satisfy Zod schema.
 */
export function getDeterministicMilestoneFallback(title?: string): ScopingResult {
  const isRetinopathy = title?.toLowerCase().includes("retinopathy") || title?.toLowerCase().includes("fundus");
  
  if (isRetinopathy) {
    return {
      milestones: [
        {
          title: "Milestone 1: Edge Model Baseline & INT8 Quantization",
          description:
            "Establish baseline latency benchmarks, preprocess fundus retinal image cohorts, and implement INT8 quantization for MobileNetV4.",
          required_skills: ["Computer Vision", "PyTorch", "Edge ML", "Python"],
          acceptance_criteria: [
            "Baseline edge inference under 50ms latency on ARM Cortex constraints",
            "Quantized model checkpoint under 15MB binary size",
            "Reproducible automated evaluation pipeline",
          ],
        },
        {
          title: "Milestone 2: Clinical Dataset Validation & Reproduction Report",
          description:
            "Validate sensitivity and specificity against clinical fundus cohorts and document reproduction benchmarks in technical report.",
          required_skills: ["Medical Imaging", "Model Evaluation", "Biostatistics"],
          acceptance_criteria: [
            "Validation sensitivity exceeding 90% across 5-fold cross-validation",
            "Comprehensive error analysis and confusion matrix documented",
            "Joint technical reproduction paper with named student contributors",
          ],
        },
      ],
    };
  }

  return {
    milestones: [
      {
        title: "Milestone 1: Architecture Baseline & Data Pipeline Setup",
        description:
          "Construct initial ingestion harness, configure reproducible benchmarking framework, and define core interfaces.",
        required_skills: ["Python", "Data Processing", "System Design"],
        acceptance_criteria: [
          "Automated pipeline running across baseline dataset",
          "Unit test suite achieving 85%+ code coverage",
        ],
      },
      {
        title: "Milestone 2: Performance Evaluation & Benchmark Report",
        description:
          "Benchmark final deliverables against target quality and efficiency metrics and compile peer-reviewed documentation.",
        required_skills: ["Model Evaluation", "Data Analysis", "Technical Writing"],
        acceptance_criteria: [
          "Performance verified against target acceptance thresholds",
          "Complete documentation and reproducible audit artifact published",
        ],
      },
    ],
  };
}

/**
 * Cleanly extracts and parses JSON from raw LLM output, handling markdown fences.
 */
export function parseScopingJson(rawOutput: string): unknown | null {
  try {
    let clean = rawOutput.trim();
    // Strip markdown code fences if present
    if (clean.includes("```json")) {
      const match = clean.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        clean = match[1].trim();
      }
    } else if (clean.includes("```")) {
      const match = clean.match(/```\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        clean = match[1].trim();
      }
    }
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

/**
 * Executes AI Project Scoping respecting data privacy routing:
 * - Public data -> Cloud Gemini
 * - Confidential/Mixed/Unknown -> Local Ollama (fail-closed)
 * - Validates output with Zod
 * - Falls back safely if LLM returns invalid JSON or errors out
 */
export async function scopeProjectWithAi(params: {
  title: string;
  publicSummary: string;
  engagementModel: string;
  dataSensitivity: string;
  requiredSkills?: string[];
}): Promise<ScopingExecutionResponse> {
  const classification: DataClassification =
    params.dataSensitivity?.toLowerCase() === "public" ? "PUBLIC" : "CONFIDENTIAL";

  const systemPrompt = `You are a technical research scoping assistant for Gardenia 2K26.
You must generate EXACTLY TWO (2) sequential research milestones based on the project information provided.
You MUST return ONLY valid JSON matching this exact structure:
{
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "required_skills": ["string", "string"],
      "acceptance_criteria": ["string", "string"]
    },
    {
      "title": "string",
      "description": "string",
      "required_skills": ["string", "string"],
      "acceptance_criteria": ["string", "string"]
    }
  ]
}
Do not include any prose, greetings, or explanations outside the JSON object.`;

  const userPrompt = `Project Title: ${params.title}
Engagement Model: ${params.engagementModel}
Public Summary: ${params.publicSummary}
${params.requiredSkills ? `Desired Skills: ${params.requiredSkills.join(", ")}` : ""}

Generate the 2 scoped milestones in the required JSON format.`;

  // Dispatch through the existing Two-Model Privacy Router
  const routeResult = await routeAiRequest({
    prompt: userPrompt,
    classification,
    systemPrompt,
  });

  // Attempt to parse and validate with Zod
  const parsedJson = parseScopingJson(routeResult.output);
  const zodValidation = ScopingResultSchema.safeParse(parsedJson);

  if (zodValidation.success) {
    const isFallbackUsed =
      routeResult.status === "CLOUD_FALLBACK_USED" ||
      routeResult.status === "LOCAL_AI_UNAVAILABLE";

    return {
      result: zodValidation.data,
      aiProvider: routeResult.provider,
      dataClassification: classification,
      fallbackUsed: isFallbackUsed,
      routeBadge: routeResult.routeBadge,
      status: routeResult.status,
      latencyMs: routeResult.latencyMs,
    };
  }

  // If Gemini or Local returned malformed JSON or error, safely use deterministic fallback
  const fallbackResult = getDeterministicMilestoneFallback(params.title);

  return {
    result: fallbackResult,
    aiProvider: routeResult.provider,
    dataClassification: classification,
    fallbackUsed: true,
    routeBadge: routeResult.routeBadge,
    status: routeResult.status === "SUCCESS" ? "FALLBACK_INVALID_JSON" : routeResult.status,
    latencyMs: routeResult.latencyMs,
  };
}

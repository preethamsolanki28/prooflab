import { NextRequest, NextResponse } from "next/server";
import { routeAiRequest } from "@/lib/ai/router";
import { parseScopingJson, getDeterministicMilestoneFallback } from "@/lib/ai/scoping";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, requirements, confidential_brief } = body;

    if (!title && !description) {
      return NextResponse.json(
        { error: "Please enter at least a project title or description to generate scoping." },
        { status: 400 }
      );
    }

    // PRIVACY INVARIANT: If confidential notes are present, route strictly to Local Ollama!
    const isConfidential = Boolean(confidential_brief && confidential_brief.trim().length > 0);
    const classification = isConfidential ? "CONFIDENTIAL" : "PUBLIC";

    const systemPrompt = `You are an expert research scoping assistant for ResearchMesh.
Given the project details, generate a clean, structured research plan in JSON.
You MUST output ONLY valid JSON in this exact structure:
{
  "requirements": "string summary of technical prerequisites and requirements",
  "expected_deliverables": "string summary of expected artifacts (code, report, benchmarks)",
  "skills_needed": ["Skill 1", "Skill 2", "Skill 3"],
  "milestones": [
    {
      "title": "Milestone 1: Title",
      "description": "Milestone description",
      "required_skills": ["Skill 1", "Skill 2"],
      "acceptance_criteria": ["Criteria 1", "Criteria 2"]
    },
    {
      "title": "Milestone 2: Title",
      "description": "Milestone description",
      "required_skills": ["Skill 2", "Skill 3"],
      "acceptance_criteria": ["Criteria 1", "Criteria 2"]
    }
  ]
}
No extra commentary or markdown fences. Output JSON only.`;

    const userPrompt = `Project Title: ${title || "Untitled Research"}
Description: ${description || "No description provided"}
Existing Notes: ${requirements || "None"}`;

    const routeResult = await routeAiRequest({
      prompt: userPrompt,
      systemPrompt,
      classification,
    });

    const parsed: any = parseScopingJson(routeResult.output);

    if (parsed && Array.isArray(parsed.milestones) && parsed.milestones.length >= 2) {
      return NextResponse.json({
        success: true,
        requirements: parsed.requirements || "Comprehensive research pipeline, validation dataset, and reproducible benchmarks.",
        deliverables: parsed.expected_deliverables || "Source code repository, evaluated model checkpoints, and technical evaluation report.",
        skills_needed: Array.isArray(parsed.skills_needed) ? parsed.skills_needed : ["Python", "Research", "Analysis"],
        milestones: parsed.milestones.slice(0, 2),
        aiProvider: routeResult.provider,
        routeBadge: routeResult.routeBadge,
      });
    }

    // Safe deterministic fallback if model output is unstructured
    const fallback = getDeterministicMilestoneFallback(title);
    return NextResponse.json({
      success: true,
      requirements: "Technical research baseline, pipeline configuration, and reproducible validation harness.",
      deliverables: "Validated codebase, peer-reviewed technical report, and open benchmarks.",
      skills_needed: ["Python", "Machine Learning", "Model Evaluation"],
      milestones: fallback.milestones,
      aiProvider: routeResult.provider,
      routeBadge: routeResult.routeBadge,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate AI scoping" },
      { status: 500 }
    );
  }
}

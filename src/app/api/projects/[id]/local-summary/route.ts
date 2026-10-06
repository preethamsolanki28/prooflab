import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { callLocalModel } from "@/lib/ai/local";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const admin = createAdminClient();

    // 1. Fetch public project metadata ONLY (guarantees zero confidential leakage)
    const { data: project, error } = await admin
      .from("projects")
      .select("id, title, public_summary")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: charter } = await admin
      .from("charters")
      .select("milestones_json")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const milestones = (charter?.milestones_json || []) as any[];
    const milestoneTitles = milestones
      .map((m: any, i: number) => `${i + 1}. ${m.title || m.description}`)
      .join("\n");
    const skills = Array.from(
      new Set(milestones.flatMap((m: any) => m.required_skills || []))
    ).join(", ");

    const prompt = `Project Title: ${project.title}
Public Summary: ${project.public_summary}
Milestones:
${milestoneTitles}
Skills: ${skills || "Python, Machine Learning"}

Write a concise student-friendly summary explaining what the project is about in plain English, what they may help with, and useful skills.`;

    const systemPrompt =
      "You are a helpful academic guide. Explain research projects in clear, simple language for students. Keep it short and friendly.";

    const result = await callLocalModel(prompt, {
      systemPrompt,
      timeoutMs: 6000,
    });

    let summaryText = result.output;
    if (result.status === "LOCAL_AI_UNAVAILABLE" || !summaryText || summaryText.includes("Local AI unavailable")) {
      // Clean deterministic student-friendly summary
      const m1 = milestones[0]?.title || "Preparing and cleaning dataset pipelines";
      const m2 = milestones[1]?.title || "Benchmarking and evaluating model accuracy";
      const skillText = skills || "Python, Machine Learning, Data Analysis";

      summaryText = `This project is about ${project.title.toLowerCase()}.

You may help with:
1. ${m1}
2. ${m2}

Useful skills:
${skillText}

Your work is reviewed before credits are assigned.`;
    }

    return NextResponse.json({
      summary: summaryText,
      provider: "local",
      model: result.model || "smollm2:135m",
      status: result.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

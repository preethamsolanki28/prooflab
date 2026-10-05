import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { scopeProjectWithAi } from "@/lib/ai/scoping";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    // 1. Fetch project details
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id, title, public_summary, engagement_model, data_sensitivity, sponsor_id")
      .eq("id", id)
      .single();

    if (pErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Fetch existing charter if present to read existing budget
    const { data: charter } = await admin
      .from("charters")
      .select("id, budget, milestones_json")
      .eq("project_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const totalBudget = Number(charter?.budget || 0);
    const halfBudget = totalBudget > 0 ? Math.floor(totalBudget / 2) : 0;

    // 3. Run AI Scoping (enforces Two-Model Privacy Router & Zod validation)
    const scoping = await scopeProjectWithAi({
      title: project.title,
      publicSummary: project.public_summary,
      engagementModel: project.engagement_model,
      dataSensitivity: project.data_sensitivity,
    });

    // 4. Save the 2 validated milestones into public.milestones table
    // Clean up previous unassigned milestones for this project to keep clean state
    await admin.from("milestones").delete().eq("project_id", id);

    const milestoneRows = scoping.result.milestones.map((m, idx) => ({
      project_id: id,
      title: m.title,
      description: m.description,
      required_skills: m.required_skills,
      acceptance_criteria: m.acceptance_criteria,
      status: "open",
      amount: halfBudget,
    }));

    const { data: savedMilestones, error: mErr } = await admin
      .from("milestones")
      .insert(milestoneRows)
      .select();

    if (mErr) {
      console.warn("Failed to persist to milestones table:", mErr.message);
    }

    // Update charter milestones_json as well for backward compatibility
    if (charter) {
      await admin
        .from("charters")
        .update({
          milestones_json: scoping.result.milestones.map((m, idx) => ({
            id: idx + 1,
            title: m.title,
            description: m.description,
            required_skills: m.required_skills,
            acceptance_criteria: m.acceptance_criteria,
            budget: halfBudget,
          })),
        })
        .eq("id", charter.id);
    }

    return NextResponse.json({
      success: true,
      milestones: savedMilestones || milestoneRows,
      aiProvider: scoping.aiProvider,
      dataClassification: scoping.dataClassification,
      fallbackUsed: scoping.fallbackUsed,
      routeBadge: scoping.routeBadge,
      status: scoping.status,
      latencyMs: scoping.latencyMs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute AI scoping" }, { status: 500 });
  }
}

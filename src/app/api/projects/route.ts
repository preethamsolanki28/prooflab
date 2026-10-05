import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createScopedUserClient } from "@/lib/supabase/server";
import { appendLedgerEntry } from "@/lib/ledger";

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    // Query public projects list with their latest charter overview
    const { data: projects, error } = await admin
      .from("projects")
      .select(`
        id,
        title,
        public_summary,
        engagement_model,
        data_sensitivity,
        status,
        created_at,
        sponsor_id,
        profiles:sponsor_id (
          display_name
        ),
        charters (
          id,
          version,
          budget,
          engagement_model,
          milestones_json
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    // Verify role is sponsor or admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "sponsor" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Only sponsors and administrators can post projects" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      public_summary,
      engagement_model,
      data_sensitivity,
      confidential_brief,
      budget,
      milestones,
      roles,
      ip_terms,
      publication_terms,
      confidentiality_terms,
      permitted_ai_tools,
      credit_reward_terms,
      sponsor_withdrawal_terms,
      commercialisation_terms,
    } = body;

    if (!title || !public_summary || !engagement_model || !data_sensitivity) {
      return NextResponse.json(
        { error: "Validation error: Missing required project fields" },
        { status: 400 }
      );
    }

    // 1. Insert Project into public.projects
    const { data: project, error: projErr } = await admin
      .from("projects")
      .insert({
        sponsor_id: user.id,
        title,
        public_summary,
        engagement_model,
        data_sensitivity,
        status: "active",
      })
      .select()
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: `Failed to create project: ${projErr?.message}` }, { status: 500 });
    }

    // 2. If confidential brief provided, store in separate physical table project_private_briefs
    if (confidential_brief && confidential_brief.trim().length > 0) {
      const { error: briefErr } = await admin.from("project_private_briefs").insert({
        project_id: project.id,
        confidential_brief: confidential_brief.trim(),
      });
      if (briefErr) {
        return NextResponse.json({ error: `Failed to store confidential brief: ${briefErr.message}` }, { status: 500 });
      }
    }

    // 3. Insert Charter v1 into public.charters
    const { data: charter, error: charterErr } = await admin
      .from("charters")
      .insert({
        project_id: project.id,
        version: 1,
        engagement_model,
        budget: budget ? Number(budget) : 0,
        milestones_json: milestones || [
          {
            id: 1,
            title: "Milestone 1: Project Setup & Baseline",
            budget: budget ? Math.floor(Number(budget) / 2) : 0,
            description: "Initial research and pipeline setup",
            required_skills: ["Research", "Implementation"],
          },
        ],
        roles_json: roles || [
          { role: "student", count: 2, focus: "Core research and implementation" },
        ],
        ip_terms: ip_terms || "Attribution to human contributors under open research license.",
        publication_terms: publication_terms || "Joint academic publication with named human student authors.",
        confidentiality_terms:
          confidentiality_terms ||
          (data_sensitivity === "confidential"
            ? "Strict local model only for confidential briefs. No cloud LLM access to sensitive datasets."
            : "Public project data; cloud LLM allowed."),
        permitted_ai_tools:
          permitted_ai_tools ||
          (data_sensitivity === "confidential" ? "Local models only" : "OpenRouter cloud API & local models"),
        credit_reward_terms:
          credit_reward_terms || "Proportional reward/credit distribution based on human review.",
        sponsor_withdrawal_terms:
          sponsor_withdrawal_terms || "Accepted contributions retain full research credits upon withdrawal.",
        commercialisation_terms:
          commercialisation_terms || "Non-exclusive commercial deployment with contributor attribution.",
      })
      .select()
      .single();

    if (charterErr) {
      return NextResponse.json({ error: `Failed to create charter: ${charterErr.message}` }, { status: 500 });
    }

    // 4. Record PROJECT_POSTED in the Append-Only Cryptographic Ledger
    await appendLedgerEntry(admin, {
      projectId: project.id,
      actorId: user.id,
      action: "PROJECT_POSTED",
      entityType: "project",
      entityId: project.id,
      payload: {
        title: project.title,
        engagement_model: project.engagement_model,
        budget: budget || 0,
        data_sensitivity: project.data_sensitivity,
        sponsor_name: profile.display_name,
      },
    });

    // 5. Record CHARTER_CREATED in Ledger
    if (charter) {
      await appendLedgerEntry(admin, {
        projectId: project.id,
        actorId: user.id,
        action: "CHARTER_CREATED",
        entityType: "charter",
        entityId: charter.id,
        payload: {
          version: 1,
          budget: charter.budget,
          engagement_model: charter.engagement_model,
          milestones_count: Array.isArray(milestones) ? milestones.length : 1,
        },
      });
    }

    return NextResponse.json({
      success: true,
      project,
      charter,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

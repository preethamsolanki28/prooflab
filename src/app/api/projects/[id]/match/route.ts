import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { matchCandidates, enrichMatchExplanations } from "@/lib/matching/matcher";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const targetRoleParam = searchParams.get("role"); // "student" | "expert" | null

    // 1. Fetch project title and milestones to gather required skills
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id, title")
      .eq("id", id)
      .single();

    if (pErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Read required skills from milestones table or charter
    const { data: milestones } = await admin
      .from("milestones")
      .select("required_skills")
      .eq("project_id", id);

    let allRequiredSkills: string[] = [];
    if (milestones && milestones.length > 0) {
      for (const m of milestones) {
        if (Array.isArray(m.required_skills)) {
          allRequiredSkills.push(...m.required_skills);
        }
      }
    } else {
      // Fallback to charter milestones
      const { data: charter } = await admin
        .from("charters")
        .select("milestones_json")
        .eq("project_id", id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (charter && Array.isArray(charter.milestones_json)) {
        for (const m of charter.milestones_json as any[]) {
          if (Array.isArray(m.required_skills)) {
            allRequiredSkills.push(...m.required_skills);
          }
        }
      }
    }

    // Default skills if none listed
    if (allRequiredSkills.length === 0) {
      allRequiredSkills = ["Computer Vision", "PyTorch", "Edge Inference", "Python"];
    }

    // Deduplicate skills
    const uniqueRequiredSkills = Array.from(new Set(allRequiredSkills));

    // 2. Fetch candidate profiles from database
    const { data: candidateProfiles, error: cErr } = await admin
      .from("profiles")
      .select("id, display_name, role, skills, verified, conflict_of_interest")
      .in("role", ["student", "expert"]);

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    const candidates = candidateProfiles || [];

    // 3. Run Deterministic Matching
    const targetRole =
      targetRoleParam === "student" || targetRoleParam === "expert"
        ? targetRoleParam
        : undefined;

    const scoredMatches = matchCandidates(candidates, uniqueRequiredSkills, targetRole);

    // 4. Optionally enrich explanations via Gemini (safe non-blocking public explanation)
    const enrichedMatches = await enrichMatchExplanations(scoredMatches, project.title);

    return NextResponse.json({
      success: true,
      projectId: id,
      requiredSkills: uniqueRequiredSkills,
      targetRole: targetRole || "all",
      matches: enrichedMatches,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Candidate matching error" }, { status: 500 });
  }
}

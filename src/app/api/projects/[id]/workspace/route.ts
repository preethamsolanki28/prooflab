import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const admin = createAdminClient();

    let user: any = null;
    if (token) {
      const { data: userData } = await admin.auth.getUser(token);
      user = userData?.user || null;
    }

    // 1. Fetch project details
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id, title, status, sponsor_id, public_summary, data_sensitivity")
      .eq("id", projectId)
      .single();

    if (pErr || !project) {
      return NextResponse.json(
        { access: "LOCKED", error: "Project not found" },
        { status: 404 }
      );
    }

    // 2. Once the project is created, workspace access is open to all
    const isSponsor = user ? project.sponsor_id === user.id : false;

    let isApprovedMember = true;
    if (user) {
      const { data: member } = await admin
        .from("project_members")
        .select("status")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (member && member.status === "accepted") {
        isApprovedMember = true;
      }
    }

    // 3. Fetch supplementary workspace context: members, charter milestones, commits
    const { data: membersData } = await admin
      .from("project_members")
      .select("user_id, role, status, joined_at, profiles:user_id(display_name, role)")
      .eq("project_id", projectId);

    const { data: charterData } = await admin
      .from("charters")
      .select("milestones_json, budget")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    let commitsList: any[] = [];
    try {
      const { data: commits } = await admin
        .from("workspace_commits")
        .select("id, commit_hash, commit_message, branch, changed_files, created_at, user_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20);
      commitsList = commits || [];
    } catch {
      commitsList = [];
    }

    // 4. Authorized — return workspace configuration
    const workspaceServiceUrl = process.env.WORKSPACE_SERVICE_URL || null;

    return NextResponse.json({
      access: "ACTIVE",
      project: {
        id: project.id,
        title: project.title,
        publicSummary: project.public_summary || "",
        dataSensitivity: project.data_sensitivity || "confidential",
        status: project.status,
        githubRepoUrl: (project as any).github_repo_url || null,
        budget: charterData?.budget || 0,
      },
      user: {
        id: user?.id || null,
        isSponsor,
        isApprovedMember,
      },
      members: membersData || [],
      milestones: charterData?.milestones_json || [],
      commits: commitsList,
      workspaceServiceUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { access: "LOCKED", error: err.message || "Failed to authorize workspace access" },
      { status: 500 }
    );
  }
}

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

    if (!token) {
      return NextResponse.json(
        { access: "LOCKED", error: "Unauthorized: Missing authentication token" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json(
        { access: "LOCKED", error: "Unauthorized: Invalid session" },
        { status: 401 }
      );
    }

    // 1. Fetch project details
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id, title, status, sponsor_id, github_repo_url, public_summary, data_sensitivity")
      .eq("id", projectId)
      .single();

    if (pErr || !project) {
      return NextResponse.json(
        { access: "LOCKED", error: "Project not found" },
        { status: 404 }
      );
    }

    // 2. Authorization check:
    // User must be the sponsor, an admin, or an approved member (status === 'accepted')
    const isSponsor = project.sponsor_id === user.id;

    let isAdmin = false;
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      isAdmin = true;
    }

    let isApprovedMember = false;
    const { data: member } = await admin
      .from("project_members")
      .select("status")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (member && member.status === "accepted") {
      isApprovedMember = true;
    }

    if (!isSponsor && !isAdmin && !isApprovedMember) {
      return NextResponse.json(
        {
          access: "LOCKED",
          error: "Access Denied: You must be an approved project member or sponsor to access the workspace.",
        },
        { status: 403 }
      );
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
        githubRepoUrl: project.github_repo_url || null,
        budget: charterData?.budget || 0,
      },
      user: {
        id: user.id,
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

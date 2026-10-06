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
      .select("id, title, status, sponsor_id, github_repo_url")
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

    // 3. Authorized — return workspace configuration
    const workspaceServiceUrl = process.env.WORKSPACE_SERVICE_URL || null;

    return NextResponse.json({
      access: "ACTIVE",
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        githubRepoUrl: project.github_repo_url || null,
      },
      user: {
        id: user.id,
        isSponsor,
        isApprovedMember,
      },
      workspaceServiceUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { access: "LOCKED", error: err.message || "Failed to authorize workspace access" },
      { status: 500 }
    );
  }
}

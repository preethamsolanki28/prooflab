import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { submitContribution, getProjectContributions } from "@/lib/contributions/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const milestoneId = searchParams.get("milestoneId") || undefined;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId parameter" }, { status: 400 });
    }

    const admin = createAdminClient();
    const contributions = await getProjectContributions(admin, projectId, milestoneId);
    return NextResponse.json({ contributions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch contributions" }, { status: 500 });
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
      return NextResponse.json({ error: "Unauthorized: Invalid session token" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, milestoneId, title, summary, contributionType, aiAssisted, aiProvider } = body;

    if (!projectId || !title || !summary) {
      return NextResponse.json({ error: "Missing required fields: projectId, title, summary" }, { status: 400 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // STRICT: ownerId is derived strictly from authenticated user. Never trust client-supplied owner_id.
    const contribution = await submitContribution(admin, {
      projectId,
      milestoneId: milestoneId || undefined,
      ownerId: user.id,
      ownerName: profile?.display_name || user.email || "Student",
      title: title.trim(),
      summary: summary.trim(),
      contributionType: contributionType || "code",
      aiAssisted: Boolean(aiAssisted),
      aiProvider: aiProvider || "none",
    });

    // Notify the sponsor to review the changes
    const { data: project } = await admin
      .from("projects")
      .select("id, title, sponsor_id")
      .eq("id", projectId)
      .single();

    if (project?.sponsor_id) {
      await admin.from("notifications").insert({
        user_id: project.sponsor_id,
        type: "MILESTONE_SUBMITTED",
        title: "Contribution Submitted for Review",
        message: `${profile?.display_name || user.email || "A contributor"} submitted changes for "${project.title}" ("${title.trim()}"). Please review the contribution and evaluate impact.`,
        project_id: projectId,
        related_user_id: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      contribution,
      message: "Contribution submitted and hashed successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit contribution" }, { status: 500 });
  }
}

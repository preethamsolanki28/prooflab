import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { appendLedgerEntry } from "@/lib/ledger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
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

    // 1. Fetch project
    const { data: project } = await admin
      .from("projects")
      .select("id, title, sponsor_id, status")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Verify authorization: sponsor or admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    const isSponsor = project.sponsor_id === user.id;
    const isAdmin = profile?.role === "admin";

    if (!isSponsor && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Only the project sponsor or system admin can mark the project as completed." },
        { status: 403 }
      );
    }

    // 3. Update project status to 'complete'
    const { error: updateErr } = await admin
      .from("projects")
      .update({ status: "complete" })
      .eq("id", projectId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 4. Record PROJECT_COMPLETED in append-only cryptographic ledger
    await appendLedgerEntry(admin, {
      projectId,
      actorId: user.id,
      action: "PROJECT_COMPLETED",
      entityType: "project",
      entityId: projectId,
      payload: {
        completed_by: profile?.display_name || user.email,
        role: profile?.role || "sponsor",
        title: project.title,
      },
    });

    // 5. Notify all accepted project members: PROJECT_COMPLETED
    const { data: members } = await admin
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("status", "accepted");

    const recipients = new Set<string>();
    members?.forEach((m) => recipients.add(m.user_id));
    recipients.add(project.sponsor_id);

    for (const memberId of recipients) {
      await admin.from("notifications").insert({
        user_id: memberId,
        type: "PROJECT_COMPLETED",
        title: `Project Completed: ${project.title}`,
        message: `Research objectives for "${project.title}" have concluded! Collaborator feedback is now open.`,
        project_id: projectId,
        related_user_id: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      status: "complete",
      message: "Project has been marked completed. Collaborator feedback is now open.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

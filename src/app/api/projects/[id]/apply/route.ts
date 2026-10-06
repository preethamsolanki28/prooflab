import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { charterId, agreement_ack } = body;

    if (!charterId) {
      return NextResponse.json({ error: "Missing required charterId" }, { status: 400 });
    }

    if (!agreement_ack) {
      return NextResponse.json(
        { error: "Explicit agreement to project terms is required to apply." },
        { status: 400 }
      );
    }

    // 1. Fetch project and charter
    const { data: project, error: projErr } = await admin
      .from("projects")
      .select("id, title, sponsor_id")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Fetch applicant profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name, role, skills, verified")
      .eq("id", user.id)
      .single();

    // 3. Check if user is already an accepted member
    const { data: existingMember } = await admin
      .from("project_members")
      .select("status")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember?.status === "accepted") {
      return NextResponse.json({
        success: true,
        alreadyAccepted: true,
        message: "You are already an accepted member of this project.",
      });
    }

    // 4. Create or update pending application in project_applications
    const { data: application, error: appErr } = await admin
      .from("project_applications")
      .upsert(
        {
          project_id: projectId,
          student_id: user.id,
          charter_id: charterId,
          status: "pending_expert_review",
          agreement_ack: true,
          created_at: new Date().toISOString(),
        },
        { onConflict: "project_id, student_id" }
      )
      .select()
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: appErr?.message || "Failed to submit application" }, { status: 500 });
    }

    // 5. Insert/update project_members with status 'pending' (satisfies DB constraint without unlocking RLS)
    await admin
      .from("project_members")
      .upsert(
        {
          project_id: projectId,
          user_id: user.id,
          role: profile?.role || "student",
          status: "pending",
          joined_at: new Date().toISOString(),
        },
        { onConflict: "project_id, user_id" }
      );

    // 6. Notify experts and sponsor that a student applied
    // Find project experts
    const { data: experts } = await admin
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("role", "expert");

    const recipientIds = new Set<string>();
    experts?.forEach((e) => recipientIds.add(e.user_id));
    if (project.sponsor_id) recipientIds.add(project.sponsor_id);

    // If no expert is currently a member, fallback to notify any expert or sponsor
    if (recipientIds.size === 0) {
      const { data: allExperts } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "expert")
        .limit(2);
      allExperts?.forEach((e) => recipientIds.add(e.id));
    }

    const applicantName = profile?.display_name || user.email || "Student";
    const studentSkills = (profile?.skills || []).join(", ") || "General ML/Development";

    for (const recipientId of recipientIds) {
      if (recipientId === user.id) continue;
      await admin.from("notifications").insert({
        user_id: recipientId,
        type: "STUDENT_APPLIED",
        title: `Student Applied: ${applicantName}`,
        message: `${applicantName} (${profile?.role || "student"}) applied to join "${project.title}". Skills: ${studentSkills}. Please review their profile.`,
        project_id: projectId,
        related_user_id: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      application,
      status: "pending_expert_review",
      message: "Application submitted successfully. Waiting for expert review.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

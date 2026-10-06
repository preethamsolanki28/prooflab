import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { appendLedgerEntry } from "@/lib/ledger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const admin = createAdminClient();

    const { data: applications, error: appErr } = await admin
      .from("project_applications")
      .select(`
        id,
        project_id,
        student_id,
        charter_id,
        status,
        agreement_ack,
        created_at,
        reviewed_at,
        reviewer_id,
        profiles:student_id (
          id,
          display_name,
          role,
          skills,
          verified
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 500 });
    }

    return NextResponse.json({ applications: applications || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

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

    const body = await req.json();
    const { studentId: reqStudentId, applicationId, action } = body;

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Missing or invalid action" }, { status: 400 });
    }

    // 1. Fetch project details
    const { data: project } = await admin
      .from("projects")
      .select("id, title, sponsor_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Fetch current application
    let appQuery = admin.from("project_applications").select("*").eq("project_id", projectId);
    if (applicationId) {
      appQuery = appQuery.eq("id", applicationId);
    } else if (reqStudentId) {
      appQuery = appQuery.eq("student_id", reqStudentId);
    } else {
      // Default to current user's application
      appQuery = appQuery.eq("student_id", user.id);
    }

    const { data: application } = await appQuery.maybeSingle();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const targetStudentId = application.student_id;
    const isStudentRespondingToInvite =
      application.status === "sponsor_invited" && user.id === targetStudentId;

    // 3. Verify authority
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    const isSponsor = project.sponsor_id === user.id;
    const isAdmin = callerProfile?.role === "admin";

    const { data: expertMember } = await admin
      .from("project_members")
      .select("role, status")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    const isExpert = callerProfile?.role === "expert" || expertMember?.role === "expert";

    if (!isStudentRespondingToInvite && !isSponsor && !isAdmin && !isExpert) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to act on this application." },
        { status: 403 }
      );
    }

    if (action === "accept") {
      // A. Update application status
      await admin
        .from("project_applications")
        .update({
          status: "accepted",
          agreement_ack: true,
          reviewer_id: isStudentRespondingToInvite ? application.reviewer_id : user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      // B. Update project_members to 'accepted'
      await admin
        .from("project_members")
        .upsert(
          {
            project_id: projectId,
            user_id: targetStudentId,
            role: "student",
            status: "accepted",
            joined_at: new Date().toISOString(),
          },
          { onConflict: "project_id, user_id" }
        );

      // C. Ensure charter_acceptances row exists so RLS unlocks project_private_briefs
      const { data: acceptance } = await admin
        .from("charter_acceptances")
        .upsert(
          {
            charter_id: application.charter_id,
            user_id: targetStudentId,
            engagement_ack: true,
          },
          { onConflict: "charter_id, user_id" }
        )
        .select()
        .single();

      // D. Record acceptance in immutable ledger
      await appendLedgerEntry(admin, {
        projectId,
        actorId: user.id,
        action: "CHARTER_ACCEPTED",
        entityType: "charter_acceptance",
        entityId: acceptance?.id || application.id,
        payload: {
          charter_id: application.charter_id,
          student_id: targetStudentId,
          type: isStudentRespondingToInvite ? "INVITATION_ACCEPTED" : "APPLICATION_ACCEPTED",
          accepted_by: callerProfile?.display_name || user.email,
        },
      });

      // E. Notify appropriate party
      if (isStudentRespondingToInvite) {
        // Student accepted sponsor invitation -> notify sponsor
        await admin.from("notifications").insert({
          user_id: project.sponsor_id,
          type: "EXPERT_ACCEPTED",
          title: "Invitation Accepted!",
          message: `${callerProfile?.display_name || "A student"} accepted your invitation to join "${project.title}". They are now an active member in the workspace.`,
          project_id: projectId,
          related_user_id: user.id,
        });
      } else {
        // Reviewer approved student application -> notify student
        await admin.from("notifications").insert({
          user_id: targetStudentId,
          type: "EXPERT_ACCEPTED",
          title: "Application Accepted!",
          message: `Congratulations! Your application for "${project.title}" has been accepted. The workspace and project brief are now unlocked.`,
          project_id: projectId,
          related_user_id: user.id,
        });
      }

      return NextResponse.json({
        success: true,
        action: "accepted",
        message: isStudentRespondingToInvite
          ? "Invitation accepted. You are now a team member in this project workspace."
          : "Student accepted. Membership is now active and protected workspace is unlocked.",
      });
    } else {
      // REJECT ACTION
      await admin
        .from("project_applications")
        .update({
          status: "rejected",
          reviewer_id: isStudentRespondingToInvite ? application.reviewer_id : user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      await admin
        .from("project_members")
        .update({ status: isStudentRespondingToInvite ? "withdrawn" : "revoked" })
        .eq("project_id", projectId)
        .eq("user_id", targetStudentId);

      if (isStudentRespondingToInvite) {
        // Student declined sponsor invitation -> notify sponsor
        await admin.from("notifications").insert({
          user_id: project.sponsor_id,
          type: "EXPERT_REJECTED",
          title: "Invitation Declined",
          message: `${callerProfile?.display_name || "A student"} declined the invitation to join "${project.title}".`,
          project_id: projectId,
          related_user_id: user.id,
        });
      } else {
        // Reviewer rejected application -> notify student
        await admin.from("notifications").insert({
          user_id: targetStudentId,
          type: "EXPERT_REJECTED",
          title: "Application Update",
          message: `Your application to join "${project.title}" was not approved at this time. You can explore and apply to other open projects.`,
          project_id: projectId,
          related_user_id: user.id,
        });
      }

      return NextResponse.json({
        success: true,
        action: "rejected",
        message: isStudentRespondingToInvite
          ? "Invitation declined."
          : "Student application was rejected.",
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

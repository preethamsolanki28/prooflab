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
      return NextResponse.json({ error: "Unauthorized: Invalid session token" }, { status: 401 });
    }

    // 1. Fetch project and verify caller is sponsor or admin
    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("id, title, sponsor_id")
      .eq("id", projectId)
      .single();

    if (pErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    const isSponsor = project.sponsor_id === user.id;
    const isAdmin = callerProfile?.role === "admin";

    if (!isSponsor && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only the project sponsor can invite candidates." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "Missing candidateId in request body" }, { status: 400 });
    }

    // 2. Fetch candidate profile
    const { data: candidateProfile, error: cErr } = await admin
      .from("profiles")
      .select("id, display_name, role, skills, verified")
      .eq("id", candidateId)
      .single();

    if (cErr || !candidateProfile) {
      return NextResponse.json({ error: "Candidate profile not found" }, { status: 404 });
    }

    // 3. Check existing membership
    const { data: existingMember } = await admin
      .from("project_members")
      .select("status")
      .eq("project_id", projectId)
      .eq("user_id", candidateId)
      .maybeSingle();

    if (existingMember?.status === "accepted") {
      return NextResponse.json(
        { error: "Candidate is already an accepted member of this project." },
        { status: 400 }
      );
    }

    // 4. Get latest active charter
    const { data: charter } = await admin
      .from("charters")
      .select("id")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (!charter) {
      return NextResponse.json({ error: "Project has no active charter." }, { status: 400 });
    }

    // 5. Upsert into project_applications with status 'sponsor_invited'
    const { data: application, error: appErr } = await admin
      .from("project_applications")
      .upsert(
        {
          project_id: projectId,
          student_id: candidateId,
          charter_id: charter.id,
          status: "sponsor_invited",
          agreement_ack: false, // Student must review and accept
          reviewer_id: user.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: "project_id, student_id" }
      )
      .select()
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: appErr?.message || "Failed to create invitation" }, { status: 500 });
    }

    // 6. Upsert into project_members with status 'sponsor_invited'
    await admin
      .from("project_members")
      .upsert(
        {
          project_id: projectId,
          user_id: candidateId,
          role: candidateProfile.role || "student",
          status: "sponsor_invited",
          joined_at: new Date().toISOString(),
        },
        { onConflict: "project_id, user_id" }
      );

    // 7. Send notification to student
    await admin.from("notifications").insert({
      user_id: candidateId,
      type: "SPONSOR_INVITED",
      title: `Invitation: ${project.title}`,
      message: `${callerProfile?.display_name || "The sponsor"} invited you to join "${project.title}". Review and accept or reject the invitation to access the workspace.`,
      project_id: projectId,
      related_user_id: user.id,
    });

    // 8. Append to immutable audit ledger
    await appendLedgerEntry(admin, {
      projectId,
      actorId: user.id,
      action: "INVITATION_SENT" as any,
      entityType: "project_invitation" as any,
      entityId: application.id,
      payload: {
        sponsor_id: user.id,
        candidate_id: candidateId,
        candidate_name: candidateProfile.display_name,
        charter_id: charter.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation successfully sent to ${candidateProfile.display_name}.`,
      application,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send invitation" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const admin = createAdminClient();

    let query = admin
      .from("project_feedback")
      .select(`
        id,
        project_id,
        reviewer_id,
        reviewee_id,
        work_quality,
        reliability,
        communication,
        comment,
        created_at,
        reviewer:reviewer_id (
          id,
          display_name,
          role
        ),
        reviewee:reviewee_id (
          id,
          display_name,
          role
        )
      `)
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: feedback, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feedback: feedback || [] });
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

    const body = await req.json();
    const {
      projectId,
      revieweeId,
      workQuality,
      reliability,
      communication,
      comment,
    } = body;

    if (!projectId || !revieweeId) {
      return NextResponse.json({ error: "Missing required projectId or revieweeId" }, { status: 400 });
    }

    // 1. Rule: No self-review
    if (user.id === revieweeId) {
      return NextResponse.json({ error: "SELF_REVIEW_DISALLOWED: You cannot review yourself." }, { status: 400 });
    }

    // 2. Rule: Ratings must be between 1 and 5
    const wq = Number(workQuality);
    const rel = Number(reliability);
    const comm = Number(communication);

    if (
      isNaN(wq) || wq < 1 || wq > 5 ||
      isNaN(rel) || rel < 1 || rel > 5 ||
      isNaN(comm) || comm < 1 || comm > 5
    ) {
      return NextResponse.json({ error: "Ratings must be integer values between 1 and 5." }, { status: 400 });
    }

    // 3. Rule: Project must be completed
    const { data: project } = await admin
      .from("projects")
      .select("id, title, status, sponsor_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status !== "complete") {
      return NextResponse.json({
        error: "FEEDBACK_UNAVAILABLE: Feedback can only be submitted after the project has been marked completed.",
      }, { status: 400 });
    }

    // 4. Rule: Both reviewer and reviewee must have worked together on the project
    const { data: members } = await admin
      .from("project_members")
      .select("user_id, status")
      .eq("project_id", projectId);

    const isReviewerAccepted =
      project.sponsor_id === user.id ||
      members?.some((m) => m.user_id === user.id && m.status === "accepted");

    const isRevieweeAccepted =
      project.sponsor_id === revieweeId ||
      members?.some((m) => m.user_id === revieweeId && m.status === "accepted");

    if (!isReviewerAccepted) {
      return NextResponse.json({
        error: "NON_PARTICIPANT: You were not an accepted participant on this project.",
      }, { status: 403 });
    }

    if (!isRevieweeAccepted) {
      return NextResponse.json({
        error: "NON_PARTICIPANT: The person you are reviewing was not an accepted participant on this project.",
      }, { status: 400 });
    }

    // 5. Rule: Check for duplicate review (One reviewer -> one reviewee -> one project = one feedback)
    const { data: existingFeedback } = await admin
      .from("project_feedback")
      .select("id")
      .eq("project_id", projectId)
      .eq("reviewer_id", user.id)
      .eq("reviewee_id", revieweeId)
      .maybeSingle();

    if (existingFeedback) {
      return NextResponse.json({
        error: "DUPLICATE_REVIEW: You have already submitted feedback for this collaborator on this project.",
      }, { status: 409 });
    }

    // 6. Insert feedback record
    const { data: feedbackRow, error: insertErr } = await admin
      .from("project_feedback")
      .insert({
        project_id: projectId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        work_quality: wq,
        reliability: rel,
        communication: comm,
        comment: comment?.trim() || "",
      })
      .select()
      .single();

    if (insertErr || !feedbackRow) {
      return NextResponse.json({ error: insertErr?.message || "Failed to record feedback" }, { status: 500 });
    }

    // 7. Notify reviewee
    const { data: reviewerProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const reviewerName = reviewerProfile?.display_name || "A collaborator";

    await admin.from("notifications").insert({
      user_id: revieweeId,
      type: "FEEDBACK_AVAILABLE",
      title: "New Collaborator Feedback",
      message: `${reviewerName} submitted feedback for your work on "${project.title}". Check your profile!`,
      project_id: projectId,
      related_user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      feedback: feedbackRow,
      message: "Collaborator feedback submitted successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing profile ID" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Fetch user profile
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, display_name, role, skills, verified, created_at, bio, github_url, linkedin_url, avatar_url")
      .eq("id", id)
      .maybeSingle();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2. Fetch feedback / reviews received by this user
    const { data: feedbackRows, error: fbErr } = await admin
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
        projects:project_id (
          title
        ),
        reviewer_profile:reviewer_id (
          display_name,
          role
        )
      `)
      .eq("reviewee_id", id)
      .order("created_at", { ascending: false });

    // 3. Server-side authoritative rating calculations
    const totalReviews = feedbackRows?.length || 0;
    let avgWorkQuality = 0;
    let avgReliability = 0;
    let avgCommunication = 0;
    let overallRating = 0;

    if (totalReviews > 0 && feedbackRows) {
      const sumWork = feedbackRows.reduce((acc, r) => acc + (r.work_quality || 0), 0);
      const sumRel = feedbackRows.reduce((acc, r) => acc + (r.reliability || 0), 0);
      const sumComm = feedbackRows.reduce((acc, r) => acc + (r.communication || 0), 0);

      avgWorkQuality = Number((sumWork / totalReviews).toFixed(1));
      avgReliability = Number((sumRel / totalReviews).toFixed(1));
      avgCommunication = Number((sumComm / totalReviews).toFixed(1));
      overallRating = Number(
        ((avgWorkQuality + avgReliability + avgCommunication) / 3).toFixed(1)
      );
    }

    // 4. Calculate completed projects count (public project title only, no private brief)
    // Projects where user is accepted member or sponsor AND project status is complete
    const { data: memberProjects } = await admin
      .from("project_members")
      .select("project_id, projects!inner(status)")
      .eq("user_id", id)
      .eq("status", "accepted")
      .eq("projects.status", "complete");

    const { data: sponsoredProjects } = await admin
      .from("projects")
      .select("id")
      .eq("sponsor_id", id)
      .eq("status", "complete");

    const completedProjectIds = new Set<string>();
    memberProjects?.forEach((mp: any) => completedProjectIds.add(mp.project_id));
    sponsoredProjects?.forEach((sp: any) => completedProjectIds.add(sp.id));
    const projectsCompleted = completedProjectIds.size;

    // 5. Calculate Research Credits (for students / contributors)
    const { data: approvedContributions } = await admin
      .from("contributions")
      .select("research_credits")
      .eq("owner_id", id)
      .eq("status", "approved");

    const totalCredits = (approvedContributions || []).reduce(
      (acc, c) => acc + (Number(c.research_credits) || 0),
      0
    );

    // 6. Format collaborator feedback items cleanly
    const formattedReviews = (feedbackRows || []).map((fb: any) => ({
      id: fb.id,
      reviewer_name: fb.reviewer_profile?.display_name || "Collaborator",
      reviewer_role: fb.reviewer_profile?.role || "researcher",
      project_title: fb.projects?.title || "Research Project",
      work_quality: fb.work_quality,
      reliability: fb.reliability,
      communication: fb.communication,
      comment: fb.comment,
      created_at: fb.created_at,
    }));

    return NextResponse.json({
      profile,
      stats: {
        projects_completed: projectsCompleted,
        total_research_credits: totalCredits,
        total_reviews: totalReviews,
        overall_rating: totalReviews > 0 ? overallRating : 5.0,
        work_quality: totalReviews > 0 ? avgWorkQuality : 5.0,
        reliability: totalReviews > 0 ? avgReliability : 5.0,
        communication: totalReviews > 0 ? avgCommunication : 5.0,
        has_reviews: totalReviews > 0,
      },
      reviews: formattedReviews,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user || user.id !== id) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own profile" }, { status: 403 });
    }

    const body = await req.json();
    const { bio, github_url, linkedin_url, skills, display_name } = body;

    const updates: Record<string, any> = {};
    if (bio !== undefined) updates.bio = bio;
    if (github_url !== undefined) updates.github_url = github_url;
    if (linkedin_url !== undefined) updates.linkedin_url = linkedin_url;
    if (display_name !== undefined) updates.display_name = display_name;
    if (skills !== undefined && Array.isArray(skills)) updates.skills = skills;

    const { data: updated, error: updateErr } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 });
  }
}


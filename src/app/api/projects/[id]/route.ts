import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    // 1. Fetch project details
    const { data: project, error: projErr } = await admin
      .from("projects")
      .select(`
        id,
        title,
        public_summary,
        engagement_model,
        data_sensitivity,
        status,
        created_at,
        sponsor_id,
        profiles:sponsor_id (
          id,
          display_name,
          role
        )
      `)
      .eq("id", id)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Fetch latest charter
    const { data: charter } = await admin
      .from("charters")
      .select("*")
      .eq("project_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    // 3. Fetch project members
    const { data: members } = await admin
      .from("project_members")
      .select(`
        user_id,
        role,
        status,
        joined_at,
        profiles:user_id (
          display_name
        )
      `)
      .eq("project_id", id);

    // 4. Check if current requesting user is authenticated & accepted
    let userAcceptance = null;
    let userApplication = null;
    let isMember = false;
    let isSponsor = false;
    let isPending = false;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token && charter) {
      const { data: { user } } = await admin.auth.getUser(token);
      if (user) {
        if (project.sponsor_id === user.id) {
          isSponsor = true;
          isMember = true;
        }

        const { data: memberRecord } = await admin
          .from("project_members")
          .select("status, role")
          .eq("project_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberRecord?.status === "accepted") {
          isMember = true;
        } else if (memberRecord?.status === "pending") {
          isPending = true;
        }

        const { data: acceptance } = await admin
          .from("charter_acceptances")
          .select("*")
          .eq("charter_id", charter.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (acceptance) {
          userAcceptance = acceptance;
          // In M0/M1 tests, charter_acceptances triggers accepted membership
          isMember = true;
        }

        const { data: appRecord } = await admin
          .from("project_applications")
          .select("*")
          .eq("project_id", id)
          .eq("student_id", user.id)
          .maybeSingle();

        if (appRecord) {
          userApplication = appRecord;
          if (appRecord.status === "pending_expert_review") {
            isPending = true;
          }
        }
      }
    }

    // 5. Check if confidential brief exists (boolean indicator only, never leak content)
    const { count: briefCount } = await admin
      .from("project_private_briefs")
      .select("project_id", { count: "exact", head: true })
      .eq("project_id", id);

    return NextResponse.json({
      project,
      charter: charter || null,
      members: members || [],
      userAcceptance,
      userApplication,
      isMember,
      isPending,
      isSponsor,
      hasConfidentialBrief: (briefCount ?? 0) > 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

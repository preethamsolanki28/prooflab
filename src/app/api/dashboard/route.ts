import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const isSponsor = profile?.role === "sponsor" || profile?.role === "admin";

    if (isSponsor) {
      // 1. Fetch Sponsor Projects
      const { data: projects } = await admin
        .from("projects")
        .select(`
          id,
          title,
          public_summary,
          status,
          created_at,
          budget,
          milestones ( id, title, status, amount )
        `)
        .eq("sponsor_id", user.id)
        .order("created_at", { ascending: false });

      const projectIds = (projects || []).map((p) => p.id);

      // 2. Fetch Pending Applications for sponsor's projects
      let pendingApplications: any[] = [];
      if (projectIds.length > 0) {
        const { data: apps } = await admin
          .from("project_applications")
          .select(`
            id,
            status,
            created_at,
            student_id,
            project_id,
            projects:project_id ( id, title ),
            student:student_id ( id, display_name, role, skills, verified, bio, github_url, linkedin_url )
          `)
          .in("project_id", projectIds)
          .eq("status", "pending_expert_review")
          .order("created_at", { ascending: false });

        const rawApps = apps || [];
        const applicantIds = Array.from(new Set(rawApps.map((a: any) => a.student_id)));

        const reviewsByStudent: Record<string, any[]> = {};
        if (applicantIds.length > 0) {
          const { data: revs } = await admin
            .from("project_feedback")
            .select("reviewee_id, work_quality, reliability, communication, comment, created_at")
            .in("reviewee_id", applicantIds);
          for (const r of revs || []) {
            if (!reviewsByStudent[r.reviewee_id]) reviewsByStudent[r.reviewee_id] = [];
            reviewsByStudent[r.reviewee_id].push(r);
          }
        }

        pendingApplications = rawApps.map((app: any) => {
          const rList = reviewsByStudent[app.student_id] || [];
          const count = rList.length;
          const avgWork = count
            ? Number((rList.reduce((acc, r) => acc + r.work_quality, 0) / count).toFixed(1))
            : 5.0;
          const avgRel = count
            ? Number((rList.reduce((acc, r) => acc + r.reliability, 0) / count).toFixed(1))
            : 5.0;
          const avgComm = count
            ? Number((rList.reduce((acc, r) => acc + r.communication, 0) / count).toFixed(1))
            : 5.0;
          const overall = Number(((avgWork + avgRel + avgComm) / 3).toFixed(1));
          return {
            ...app,
            rating: {
              overall: count > 0 ? overall : 5.0,
              workQuality: avgWork,
              reliability: avgRel,
              communication: avgComm,
              reviewCount: count,
              recentFeedback: rList.slice(0, 2),
            },
          };
        });
      }

      // 3. Fetch Escrows for sponsor projects
      let availableEscrow = 0;
      let releasedRewards = 0;
      if (projectIds.length > 0) {
        const { data: escrows } = await admin
          .from("escrows")
          .select("amount, status")
          .in("project_id", projectIds);

        for (const esc of escrows || []) {
          if (esc.status === "FUNDED") availableEscrow += Number(esc.amount || 0);
          if (esc.status === "RELEASED") releasedRewards += Number(esc.amount || 0);
        }
      }

      // 4. Fetch Recent Notifications
      const { data: notifications } = await admin
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      return NextResponse.json({
        role: "sponsor",
        stats: {
          publishedProjects: (projects || []).length,
          pendingApplications: pendingApplications.length,
          availableEscrow,
          releasedRewards,
        },
        projects: projects || [],
        pendingApplications,
        recentActivity: notifications || [],
      });
    } else {
      // STUDENT / RESEARCHER DASHBOARD DATA
      // 1. Fetch Projects user is accepted member of
      const { data: memberships } = await admin
        .from("project_members")
        .select(`
          status,
          role,
          project:project_id (
            id,
            title,
            public_summary,
            status,
            budget,
            sponsor:sponsor_id ( display_name )
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

      const activeProjects = (memberships || [])
        .map((m: any) => m.project)
        .filter(Boolean);

      // 2. Fetch User Applications
      const { data: applications } = await admin
        .from("project_applications")
        .select(`
          id,
          status,
          created_at,
          project:project_id (
            id,
            title,
            sponsor:sponsor_id ( display_name )
          )
        `)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      const pendingCount = (applications || []).filter(
        (a) => a.status === "pending_expert_review" || a.status === "sponsor_invited"
      ).length;

      // 3. Fetch Verified Credits from reviewed contributions
      const { data: contributions } = await admin
        .from("contributions")
        .select(`
          id,
          project_id,
          reviews ( impact_score, decision )
        `)
        .eq("owner_id", user.id);

      let verifiedCredits = 0;
      for (const c of contributions || []) {
        const approved = (c.reviews || []).find((r: any) => r.decision === "APPROVED");
        if (approved) verifiedCredits += Number(approved.impact_score || 0);
      }

      // 4. Calculate Earnings / Share
      const { data: payouts } = await admin
        .from("payouts")
        .select("amount")
        .eq("user_id", user.id);

      let totalEarnings = 0;
      for (const p of payouts || []) {
        totalEarnings += Number(p.amount || 0);
      }

      // 5. Recent Activity from notifications
      const { data: notifications } = await admin
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      // 6. Proportional Summary Context
      const totalProjectCredits = verifiedCredits > 0 ? verifiedCredits + 12 : 0;
      const studentRewardPool = activeProjects.length > 0 ? 40000 : 0;
      const estimatedReward =
        totalProjectCredits > 0
          ? Math.round((studentRewardPool * verifiedCredits) / totalProjectCredits)
          : 0;

      // 7. Fetch Available Projects for student to apply (Section 15)
      const { data: availableProjects } = await admin
        .from("projects")
        .select(`
          id,
          title,
          public_summary,
          requirements,
          skills_needed,
          budget,
          status,
          sponsor:sponsor_id ( id, display_name )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);

      return NextResponse.json({
        role: "student",
        stats: {
          activeProjects: activeProjects.length,
          pendingApplications: pendingCount,
          verifiedCredits,
          earnings: totalEarnings || estimatedReward,
        },
        myProjects: activeProjects,
        myApplications: applications || [],
        availableProjects: availableProjects || [],
        recentActivity: notifications || [],
        earningsSummary: {
          yourCredits: verifiedCredits,
          totalCredits: totalProjectCredits,
          rewardPool: studentRewardPool,
          sharePercent:
            totalProjectCredits > 0
              ? Math.round((verifiedCredits / totalProjectCredits) * 100)
              : 0,
          estimatedReward: totalEarnings || estimatedReward,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load dashboard data" }, { status: 500 });
  }
}

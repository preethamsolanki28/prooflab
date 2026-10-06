import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { appendLedgerEntry } from "@/lib/ledger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const {
      data: { user },
      error: authErr,
    } = await admin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Verify project exists
    const { data: project } = await admin
      .from("projects")
      .select("id, sponsor_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch active grants
    const { data: grants } = await admin
      .from("project_private_ai_access")
      .select("*")
      .eq("project_id", projectId);

    const accessMap: Record<string, boolean> = {};
    (grants || []).forEach((g) => {
      accessMap[g.member_id] = g.status === "granted" && !g.revoked_at;
    });

    // Check specific user access
    const isSponsor = project.sponsor_id === user.id;
    const userHasAccess = isSponsor || Boolean(accessMap[user.id]);

    return NextResponse.json({
      grants: grants || [],
      accessMap,
      userHasAccess,
      isSponsor,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch private AI access" },
      { status: 500 }
    );
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const {
      data: { user },
      error: authErr,
    } = await admin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Verify user is sponsor of this project or admin
    const { data: project } = await admin
      .from("projects")
      .select("id, title, sponsor_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAuthorized = project.sponsor_id === user.id || profile?.role === "admin";
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Only the project sponsor can manage confidential AI access" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { memberId, action } = body;

    if (!memberId || (action !== "grant" && action !== "revoke")) {
      return NextResponse.json(
        { error: "memberId and action ('grant' or 'revoke') are required" },
        { status: 400 }
      );
    }

    // Verify member exists in project_members
    const { data: member } = await admin
      .from("project_members")
      .select("user_id, status")
      .eq("project_id", projectId)
      .eq("user_id", memberId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: "Target user is not a member of this project" },
        { status: 404 }
      );
    }

    if (action === "grant") {
      const { data: grant, error: gErr } = await admin
        .from("project_private_ai_access")
        .upsert(
          {
            project_id: projectId,
            member_id: memberId,
            granted_by: user.id,
            status: "granted",
            granted_at: new Date().toISOString(),
            revoked_at: null,
          },
          { onConflict: "project_id,member_id" }
        )
        .select()
        .single();

      if (gErr) throw gErr;

      // Update project_members column (also backed by trigger)
      await admin
        .from("project_members")
        .update({ can_use_private_ai: true })
        .eq("project_id", projectId)
        .eq("user_id", memberId);

      // Ledger event
      await appendLedgerEntry(admin, {
        projectId,
        actorId: user.id,
        action: "PRIVATE_AI_ACCESS_GRANTED",
        entityType: "project_private_ai_access",
        entityId: grant.id,
        payload: {
          memberId,
          grantedBy: user.id,
          projectTitle: project.title,
        },
      });

      // In-app notification to the student
      await admin.from("notifications").insert({
        user_id: memberId,
        project_id: projectId,
        type: "CREDITS_APPROVED", // safe enum notification
        title: "Confidential AI Access Granted",
        message: `You have been granted confidential AI access for ${project.title}.`,
      });

      return NextResponse.json({
        success: true,
        action: "granted",
        grant,
      });
    } else {
      // Revoke action
      const { data: updated, error: rErr } = await admin
        .from("project_private_ai_access")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("project_id", projectId)
        .eq("member_id", memberId)
        .select()
        .single();

      if (rErr && rErr.code !== "PGRST116") throw rErr;

      // Update project_members column
      await admin
        .from("project_members")
        .update({ can_use_private_ai: false })
        .eq("project_id", projectId)
        .eq("user_id", memberId);

      // Ledger event
      await appendLedgerEntry(admin, {
        projectId,
        actorId: user.id,
        action: "PRIVATE_AI_ACCESS_REVOKED",
        entityType: "project_private_ai_access",
        entityId: updated?.id || memberId,
        payload: {
          memberId,
          revokedBy: user.id,
          projectTitle: project.title,
        },
      });

      // In-app notification to the student
      await admin.from("notifications").insert({
        user_id: memberId,
        project_id: projectId,
        type: "APPLICATION_REJECTED", // safe enum notification
        title: "Confidential AI Access Revoked",
        message: `Your confidential AI access for ${project.title} was revoked.`,
      });

      return NextResponse.json({
        success: true,
        action: "revoked",
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update confidential AI access" },
      { status: 500 }
    );
  }
}

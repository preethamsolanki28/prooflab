import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { runResearchCopilot } from "@/lib/agent/copilot";
import { DataClassification } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required to interact with ResearchCopilot." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { data: { user }, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !user) {
      return NextResponse.json({ error: "Invalid authentication session." }, { status: 401 });
    }

    // Fetch authenticated profile to get verified human name
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    const ownerName = profile?.display_name || user.email?.split("@")[0] || "Researcher";

    const body = await req.json();
    const { projectId, task, classification } = body;

    if (!projectId || !task) {
      return NextResponse.json(
        { error: "projectId and task are required." },
        { status: 400 }
      );
    }

    const validClassification: DataClassification | undefined =
      classification === "PUBLIC" || classification === "CONFIDENTIAL"
        ? classification
        : undefined;

    // SECTION 12 & 23: Enforce strict sponsor-granted private AI access for CONFIDENTIAL data
    if (validClassification === "CONFIDENTIAL") {
      const { data: proj } = await admin
        .from("projects")
        .select("id, sponsor_id")
        .eq("id", projectId)
        .single();

      if (!proj) {
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      }

      const isSponsor = proj.sponsor_id === user.id || profile?.role === "admin";

      if (!isSponsor) {
        // Verify active membership and explicit private-AI permission
        const { data: member } = await admin
          .from("project_members")
          .select("status, can_use_private_ai")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!member || member.status !== "accepted") {
          return NextResponse.json(
            {
              error: "ACCESS_DENIED: User is not an active member of this project.",
              code: "ACCESS_DENIED",
            },
            { status: 403 }
          );
        }

        if (!member.can_use_private_ai) {
          // Check explicit grant table as fallback
          const { data: grant } = await admin
            .from("project_private_ai_access")
            .select("status, revoked_at")
            .eq("project_id", projectId)
            .eq("member_id", user.id)
            .eq("status", "granted")
            .is("revoked_at", null)
            .maybeSingle();

          if (!grant) {
            return NextResponse.json(
              {
                error:
                  "ACCESS_DENIED: Confidential local AI access has not been granted by the project sponsor.",
                code: "ACCESS_DENIED",
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Execute ResearchCopilot with server-derived authenticated human owner
    const result = await runResearchCopilot({
      projectId,
      ownerId: user.id, // STRICT: Derived from authenticated JWT
      ownerName,
      task,
      classification: validClassification,
      userToken: token,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "ResearchCopilot execution failed" },
      { status: 500 }
    );
  }
}

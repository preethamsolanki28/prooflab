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

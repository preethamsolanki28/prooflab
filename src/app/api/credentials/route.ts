import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { issueCredential, getCredentials } from "@/lib/credentials/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const admin = createAdminClient();
    const credentials = await getCredentials(admin, { projectId, userId });
    return NextResponse.json({ credentials });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch credentials" }, { status: 500 });
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
      return NextResponse.json({ error: "Unauthorized: Invalid session token" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, userId, title, contributionId, metadata } = body;

    if (!projectId || !userId || !title) {
      return NextResponse.json({ error: "Missing required fields: projectId, userId, title" }, { status: 400 });
    }

    const credential = await issueCredential(admin, {
      projectId,
      userId,
      title,
      contributionId,
      actorId: user.id, // STRICT: Derived from session
      metadata,
    });

    return NextResponse.json({
      success: true,
      credential,
      message: "Digital credential issued with zero monetary payout.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to issue credential" }, { status: 500 });
  }
}

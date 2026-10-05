import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserResearchCredits } from "@/lib/contributions/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;

    const admin = createAdminClient();
    const credits = await getUserResearchCredits(admin, userId, projectId);
    return NextResponse.json(credits);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch research credits" }, { status: 500 });
  }
}

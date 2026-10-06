import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserResearchCredits } from "@/lib/contributions/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const projectId = searchParams.get("projectId") || undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const credits = await getUserResearchCredits(admin, userId, projectId);
    return NextResponse.json(credits);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch research credits" },
      { status: 500 }
    );
  }
}

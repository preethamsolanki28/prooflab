import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserResearchCredits } from "@/lib/contributions/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("userId");
    const projectId = searchParams.get("projectId") || undefined;

    const admin = createAdminClient();

    if (!userId) {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (token) {
        const { data: { user } } = await admin.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Missing user authentication" }, { status: 401 });
    }
    const credits = await getUserResearchCredits(admin, userId, projectId);
    return NextResponse.json(credits);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch research credits" },
      { status: 500 }
    );
  }
}

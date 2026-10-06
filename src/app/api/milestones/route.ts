import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId query parameter is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: milestones, error } = await admin
      .from("milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ milestones: milestones || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const admin = createAdminClient();
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json({ error: "Invalid user token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const meta = user.user_metadata || {};

    const displayName =
      body.displayName ||
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      (user.email ? user.email.split("@")[0] : "Researcher");

    const role = body.role || meta.role || "student";
    const avatarUrl = body.avatarUrl || meta.avatar_url || meta.picture || null;

    // 1. Try to fetch existing profile
    const { data: existing, error: fetchErr } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!fetchErr && existing) {
      if (body.role && body.role !== existing.role && ["sponsor", "student", "expert", "admin"].includes(body.role)) {
        const { data: updated } = await admin
          .from("profiles")
          .update({ role: body.role })
          .eq("id", user.id)
          .select()
          .maybeSingle();
        if (updated) {
          return NextResponse.json({ success: true, profile: updated });
        }
      }
      return NextResponse.json({ success: true, profile: existing });
    }

    // 2. Insert new profile using service role admin client
    const { data: created, error: insertErr } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        display_name: displayName,
        role,
        skills: [],
        verified: true,
        avatar_url: avatarUrl,
      })
      .select()
      .maybeSingle();

    if (!insertErr && created) {
      return NextResponse.json({ success: true, profile: created });
    }

    // 3. Fallback: Return memory profile if database schema is missing/unreachable
    const memoryProfile = {
      id: user.id,
      display_name: displayName,
      role,
      skills: [],
      verified: true,
      created_at: new Date().toISOString(),
      avatar_url: avatarUrl,
    };

    return NextResponse.json({
      success: true,
      profile: memoryProfile,
      warning: insertErr ? insertErr.message : "Schema pending migration",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to ensure user profile" },
      { status: 500 }
    );
  }
}

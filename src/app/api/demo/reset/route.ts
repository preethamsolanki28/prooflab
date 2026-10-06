import { NextRequest, NextResponse } from "next/server";
import { resetDemoData } from "@/lib/seed";

export async function POST(req: NextRequest) {
  // Demo reset and seeding is strictly disabled in production
  return NextResponse.json(
    { error: "Forbidden: Demo data seeding and reset is disabled in production." },
    { status: 403 }
  );
}

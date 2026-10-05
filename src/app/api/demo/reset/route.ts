import { NextRequest, NextResponse } from "next/server";
import { resetDemoData } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    const result = await resetDemoData();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reset demo environment" },
      { status: 500 }
    );
  }
}

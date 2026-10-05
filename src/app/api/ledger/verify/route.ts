import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyLedgerChain, simulateTamperLedger } from "@/lib/ledger";

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await req.json();
    const { projectId, simulateTamper, tamperIndex } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    if (simulateTamper) {
      const result = await simulateTamperLedger(admin, projectId, tamperIndex || 1);
      return NextResponse.json({
        simulation: true,
        result,
      });
    }

    const result = await verifyLedgerChain(admin, projectId);
    return NextResponse.json({
      simulation: false,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

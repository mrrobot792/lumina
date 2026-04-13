import { NextRequest, NextResponse } from "next/server";
import { runOperation } from "@/lib/appkit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[api/run] Operation:", body.operation, body);
    const result = await runOperation(body);
    console.log("[api/run] Success:", body.operation);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[api/run] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

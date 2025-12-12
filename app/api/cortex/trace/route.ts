// Cortex Trace API
// app/api/cortex/trace/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTraceEntries } from "@/lib/cortex/trace/trace";
import { TraceSource, TraceLevel } from "@/lib/cortex/trace/types";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const source = searchParams.get("source") as TraceSource | null;
    const level = searchParams.get("level") as TraceLevel | null;
    const since = searchParams.get("since") || undefined;

    const entries = await getTraceEntries(userId, {
      limit,
      source: source || undefined,
      level: level || undefined,
      since,
    });

    return NextResponse.json({ entries });
  } catch (err: unknown) {
    console.error("[Cortex Trace] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to get trace";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




// GET /api/comm/call/list - List all call sessions
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listCallSessionsForUser, getCallStats } from "@/lib/comm/store";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const calls = await listCallSessionsForUser(userId);
    const stats = await getCallStats(userId);

    return NextResponse.json({
      calls,
      stats,
      total: calls.length,
    });
  } catch (error: any) {
    console.error("List calls error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list calls" },
      { status: 500 }
    );
  }
}
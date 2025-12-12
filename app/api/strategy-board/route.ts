// Pulse Strategy Board API
// app/api/strategy-board/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildStrategyBoard } from "@/lib/strategy-board/builder";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boardData = await buildStrategyBoard(userId);

    return NextResponse.json(boardData);
  } catch (err: unknown) {
    console.error("[Strategy Board] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to build strategy board";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




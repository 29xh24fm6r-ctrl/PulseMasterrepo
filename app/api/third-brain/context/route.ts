/**
 * Third Brain Context API
 * GET /api/third-brain/context
 * 
 * Returns a context snapshot for the current user
 * Used by AI systems to understand user context
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildContextSnapshot, buildContextString } from "@/lib/third-brain/service";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json"; // 'json' or 'text'
    const maxLength = parseInt(searchParams.get("maxLength") || "4000");

    if (format === "text") {
      const contextString = await buildContextString(userId, {
        includeEvents: true,
        includeMemories: true,
        includeInsights: true,
        includeMetrics: true,
        maxLength,
      });

      return NextResponse.json({ context: contextString });
    }

    const snapshot = await buildContextSnapshot(userId);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[ThirdBrain Context] Error:", error);
    return NextResponse.json(
      { error: "Failed to build context" },
      { status: 500 }
    );
  }
}
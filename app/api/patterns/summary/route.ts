// Power Patterns Summary API
// app/api/patterns/summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTopPowerPatterns } from "@/lib/patterns/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patterns = await getTopPowerPatterns(userId, 10);

    return NextResponse.json({
      patterns: patterns.map((p) => ({
        pattern_type: p.pattern_type,
        key: p.key,
        emotion_dominant: p.emotion_dominant,
        confidence: p.confidence,
        sample_size: p.sample_size,
      })),
    });
  } catch (err: any) {
    console.error("[PatternsSummary] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get patterns" },
      { status: 500 }
    );
  }
}


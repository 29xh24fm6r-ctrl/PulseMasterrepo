// Email Attention API
// app/api/email/attention/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { calculateEmailAttentionScore, getRiskLevel } from "@/lib/email/attention";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await calculateEmailAttentionScore(userId);

    return NextResponse.json({
      score: result.score,
      riskLevel: getRiskLevel(result.score),
      breakdown: result.breakdown,
    });
  } catch (err: any) {
    console.error("[EmailAttention] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to calculate attention score" },
      { status: 500 }
    );
  }
}


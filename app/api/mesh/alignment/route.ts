// Collective Alignment API - GET /api/mesh/alignment
// app/api/mesh/alignment/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { computeUserCollectiveAlignment } from "@/lib/mesh/alignment";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alignments = await computeUserCollectiveAlignment(userId);

    return NextResponse.json({ alignments });
  } catch (error: any) {
    console.error("Failed to compute alignment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




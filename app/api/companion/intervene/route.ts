// Companion Intervention API - POST /api/companion/intervene
// app/api/companion/intervene/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { companionIntervene } from "@/lib/companion/engine";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { situation } = body;

    if (!situation) {
      return NextResponse.json({ error: "Situation required" }, { status: 400 });
    }

    const intervention = await companionIntervene(userId, situation);

    return NextResponse.json({ intervention });
  } catch (error: any) {
    console.error("Failed to generate intervention:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




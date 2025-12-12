// Intent Recognition API - POST /api/zero-friction/intent
// app/api/zero-friction/intent/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { recognizeIntent } from "@/lib/zero-friction/intent-recognition";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, voice, actions, currentState } = body;

    const recognition = await recognizeIntent(userId, {
      text,
      voice,
      actions,
      currentState,
    });

    return NextResponse.json({ recognition });
  } catch (error: any) {
    console.error("Failed to recognize intent:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




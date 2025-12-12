// Cortex-Driven Coach API
// app/api/coaching/cortex/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildCoachContext } from "@/lib/coaching/cortex/context";
import { generateCoachResponse } from "@/lib/coaching/cortex/persona-engine";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { coachKey, userInput } = body;

    if (!coachKey || !userInput) {
      return NextResponse.json(
        { error: "Missing coachKey or userInput" },
        { status: 400 }
      );
    }

    // Build coach context
    const coachCtx = await buildCoachContext(userId);

    // Generate response
    const output = await generateCoachResponse(userId, coachKey, userInput, coachCtx);

    return NextResponse.json(output);
  } catch (err: unknown) {
    console.error("[Coach Cortex] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to generate response";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




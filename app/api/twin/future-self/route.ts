// Future Self Message API - POST /api/twin/future-self
// app/api/twin/future-self/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateFutureSelfMessage } from "@/lib/twin/future-self";

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

    const output = await generateFutureSelfMessage({
      userId,
      situation,
    });

    return NextResponse.json({ output });
  } catch (error: any) {
    console.error("Failed to generate future self message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




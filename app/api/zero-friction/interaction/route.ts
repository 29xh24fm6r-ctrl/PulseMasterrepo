// Interaction Event API - POST /api/zero-friction/interaction
// app/api/zero-friction/interaction/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logInteractionEvent } from "@/lib/zero-friction/cognitive-profile";
import { checkAndDeliverMDO } from "@/lib/zero-friction/moment-driven-onboarding";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, context } = body;

    if (!eventType) {
      return NextResponse.json({ error: "eventType required" }, { status: 400 });
    }

    // Log interaction
    await logInteractionEvent(userId, eventType, context);

    // Check for MDO triggers
    const mdoDelivery = await checkAndDeliverMDO(userId, {
      eventType,
      currentState: context,
    });

    return NextResponse.json({ logged: true, mdoDelivery });
  } catch (error: any) {
    console.error("Failed to log interaction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




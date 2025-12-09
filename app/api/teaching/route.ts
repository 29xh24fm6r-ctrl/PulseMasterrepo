/**
 * Machine Teaching API
 * GET /api/teaching - List teachings
 * POST /api/teaching - Create/manage teachings
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createTeaching,
  getTeachings,
  updateTeaching,
  deleteTeaching,
  submitFeedback,
  getRecentFeedback,
  buildTeachingContext,
  extractTeachingFromText,
  getTeachingAnalytics,
} from "@/lib/teaching/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const mode = params.get("mode");
    const type = params.get("type");

    if (mode === "context") {
      const query = params.get("q") || undefined;
      const context = await buildTeachingContext(userId, query);
      return NextResponse.json(context);
    }

    if (mode === "feedback") {
      const feedback = await getRecentFeedback(userId);
      return NextResponse.json({ feedback });
    }

    if (mode === "analytics") {
      const analytics = await getTeachingAnalytics(userId);
      return NextResponse.json(analytics);
    }

    const teachings = await getTeachings(userId, {
      type: type as any,
      activeOnly: params.get("all") !== "true",
    });

    return NextResponse.json({ teachings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "feedback") {
      const feedback = await submitFeedback(userId, body);
      return NextResponse.json({ feedback });
    }

    if (action === "extract") {
      const teaching = await extractTeachingFromText(userId, body.text);
      return NextResponse.json({ teaching });
    }

    if (action === "update") {
      const teaching = await updateTeaching(userId, body.teachingId, body.updates);
      return NextResponse.json({ teaching });
    }

    if (action === "delete") {
      const success = await deleteTeaching(userId, body.teachingId);
      return NextResponse.json({ success });
    }

    // Create new teaching
    const teaching = await createTeaching(userId, body);
    return NextResponse.json({ teaching });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

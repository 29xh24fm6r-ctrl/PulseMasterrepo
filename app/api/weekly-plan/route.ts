/**
 * Weekly Plan API
 * GET /api/weekly-plan - Get current or specific week plan
 * POST /api/weekly-plan - Update plan
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getOrCreateWeeklyPlan,
  updateWeeklyPlan,
  saveWeeklyReflection,
  getPastWeeklyPlans,
  generateWeeklyPlanSuggestions,
  generateWeeklyReview,
} from "@/lib/weekly-planner/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mode = req.nextUrl.searchParams.get("mode");
    const weekStart = req.nextUrl.searchParams.get("weekStart");

    if (mode === "history") {
      const plans = await getPastWeeklyPlans(userId);
      return NextResponse.json({ plans });
    }

    if (mode === "suggestions") {
      const suggestions = await generateWeeklyPlanSuggestions(userId, {});
      return NextResponse.json(suggestions);
    }

    const plan = await getOrCreateWeeklyPlan(
      userId,
      weekStart ? new Date(weekStart) : undefined
    );

    return NextResponse.json({ plan });
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
    const { planId, action } = body;

    if (action === "reflection") {
      const success = await saveWeeklyReflection(userId, planId, body.reflection);
      return NextResponse.json({ success });
    }

    if (action === "review") {
      const summary = await generateWeeklyReview(userId, planId);
      return NextResponse.json({ summary });
    }

    const plan = await updateWeeklyPlan(userId, planId, body);
    return NextResponse.json({ plan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
/**
 * Day Plans API
 * GET /api/planner - Get today's plan
 * POST /api/planner - Generate/regenerate today's plan
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getTodaysPlan,
  getDayPlanWithItems,
  generateDayPlan,
} from "@/lib/planning/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    let date = new Date();
    if (dateParam) {
      date = new Date(dateParam);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
    }

    const plan = await getDayPlanWithItems(userId, date);

    if (!plan) {
      return NextResponse.json({
        plan: null,
        message: "No plan for this date. Generate one?",
      });
    }

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error("[Planner GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { date: dateParam, regenerate } = body;

    let date = new Date();
    if (dateParam) {
      date = new Date(dateParam);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
    }

    // If regenerate is true, we force regeneration
    // Otherwise, just get or create
    const result = await generateDayPlan({ userId, date });

    // Fetch the full plan with items
    const plan = await getDayPlanWithItems(userId, date);

    return NextResponse.json({
      success: true,
      dayPlanId: result.dayPlanId,
      itemsCreated: result.itemsCreated,
      plan,
    });
  } catch (error: any) {
    console.error("[Planner POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
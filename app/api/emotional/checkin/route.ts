/**
 * Emotional Check-In API
 * GET /api/emotional/checkin - Get recent check-ins or today's
 * POST /api/emotional/checkin - Record a new check-in
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  recordCheckIn,
  getRecentCheckIns,
  getTodaysCheckIn,
  getEmotionalState,
  MoodLevel,
} from "@/lib/emotional/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "today";

    if (mode === "state") {
      const state = await getEmotionalState(userId);
      return NextResponse.json({ state });
    }

    if (mode === "recent") {
      const limit = parseInt(searchParams.get("limit") || "7");
      const checkIns = await getRecentCheckIns(userId, limit);
      return NextResponse.json({ checkIns });
    }

    // Default: today's check-in
    const todaysCheckIn = await getTodaysCheckIn(userId);
    return NextResponse.json({ checkIn: todaysCheckIn });
  } catch (error: any) {
    console.error("[Emotional CheckIn GET] Error:", error);
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
    const { mood, energy, stress, notes, triggers, activities } = body;

    // Validate mood
    const validMoods: MoodLevel[] = ["great", "good", "okay", "bad", "terrible"];
    if (!mood || !validMoods.includes(mood)) {
      return NextResponse.json(
        { error: "mood must be one of: great, good, okay, bad, terrible" },
        { status: 400 }
      );
    }

    // Validate energy and stress (1-5)
    if (!energy || energy < 1 || energy > 5) {
      return NextResponse.json(
        { error: "energy must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!stress || stress < 1 || stress > 5) {
      return NextResponse.json(
        { error: "stress must be between 1 and 5" },
        { status: 400 }
      );
    }

    const checkIn = await recordCheckIn({
      userId,
      mood,
      energy,
      stress,
      notes,
      triggers,
      activities,
    });

    // Get updated state
    const state = await getEmotionalState(userId);

    return NextResponse.json({
      success: true,
      checkIn,
      state,
    });
  } catch (error: any) {
    console.error("[Emotional CheckIn POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
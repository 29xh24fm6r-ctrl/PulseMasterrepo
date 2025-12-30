import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logActivity } from "@/lib/activity/logActivity";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { habitId, habitName, date, activeArchetype } = await request.json();

    if (!habitId) {
      return NextResponse.json({ ok: false, error: "habitId required" }, { status: 400 });
    }

    // Canonical Activity Log (Awards XP + Streak via trigger)
    await logActivity({
      userId,
      eventName: "habit.completed",
      source: "api",
      entityType: "habit",
      entityId: habitId,
      metadata: {
        habit_name: habitName,
        active_archetype: activeArchetype
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Habit log error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHabits } from "@/lib/data/habits";
import { awardHabitXP } from "@/lib/xp/award";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const habits = await getHabits(userId);
    const today = new Date().toISOString().split("T")[0];

    // Filter habits completed today
    const completedToday = habits.filter(h =>
      h.last_completed_at && h.last_completed_at.startsWith(today)
    );

    let matched = 0;
    let totalXp = 0;

    for (const habit of completedToday) {
      // Check if already awarded today
      const { data: existing } = await supabaseAdmin
        .from("xp_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("source_id", habit.id)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .maybeSingle();

      if (!existing) {
        // Award XP
        const result = await awardHabitXP(userId, habit.id, habit.name);
        totalXp += result.amount;
        matched++;
      }
    }

    return NextResponse.json({
      ok: true,
      matched,
      totalXp,
      message: `Swept ${matched} habits, awarded ${totalXp} XP`
    });

  } catch (err: any) {
    console.error("Habit XP sweep error:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: "Failed to sweep habit XP" },
      { status: 500 }
    );
  }
}
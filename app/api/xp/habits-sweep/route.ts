// app/api/xp/habits-sweep/route.ts (migrated from Notion to Supabase)
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardXP } from "@/lib/xp/award";

export async function POST() {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    // Get habits from Supabase
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from("habits")
      .select("id, name, metadata")
      .eq("user_id", supabaseUserId)
      .eq("active", true);

    if (habitsError) {
      console.error("Error fetching habits:", habitsError);
      return NextResponse.json({
        ok: false,
        error: "Failed to fetch habits",
      }, { status: 500 });
    }

    let totalXp = 0;
    let matched = 0;

    for (const habit of habits || []) {
      const metadata = habit.metadata || {};
      const xp = metadata.xp || 15; // Default XP for habit completion

      // Award XP using the migrated function
      const result = await awardXP("habit_completed", {
        sourceType: "habit",
        sourceId: habit.id,
        notes: habit.name,
      });

      if (result.ok && result.xpAwarded) {
        totalXp += result.xpAwarded;
        matched += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      matched,
      totalXp,
    });
  } catch (err: any) {
    console.error("Habit XP sweep error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to sweep habit XP",
      },
      { status: 500 }
    );
  }
}

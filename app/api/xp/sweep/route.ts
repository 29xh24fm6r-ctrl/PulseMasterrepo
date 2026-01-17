import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTasks } from "@/lib/data/tasks";
import { awardTaskXP } from "@/lib/xp/award";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await getTasks(userId);
    const today = new Date().toISOString().split("T")[0];

    // Filter tasks completed today
    // Note: getTasks returns all tasks, we should filter by status='done' and completed_at=today
    const completedToday = tasks.filter(t =>
      t.status === 'done' &&
      t.completed_at &&
      t.completed_at.startsWith(today)
    );

    let matched = 0;
    let totalXp = 0;

    for (const task of completedToday) {
      // Check if already awarded
      const { data: existing } = await getSupabaseAdminRuntimeClient()
        .from("xp_transactions")
        .select("id")
        .eq("user_id_uuid", userId)
        .eq("source_id", task.id)
        .maybeSingle();

      if (!existing) {
        // Award XP
        const result = await awardTaskXP(userId, task.id, task.priority, task.title);
        totalXp += result.amount;
        matched++;
      }
    }

    return NextResponse.json({
      ok: true,
      entries: matched,
      totalXp,
      message: `Swept ${matched} tasks, awarded ${totalXp} XP`
    });

  } catch (err: any) {
    console.error("XP sweep error:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: "Failed to sweep XP" },
      { status: 500 }
    );
  }
}
// app/api/xp/sweep/route.ts (migrated from Notion to Supabase)
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardXP } from "@/lib/xp/award";

export async function POST() {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    // Get completed tasks from Supabase
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, priority, metadata")
      .eq("user_id", supabaseUserId)
      .in("status", ["done", "completed", "complete"]);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      return NextResponse.json({
        ok: false,
        error: "Failed to fetch tasks",
      }, { status: 500 });
    }

    let totalXp = 0;
    let bonusXp = 0;
    let entries = 0;

    for (const task of tasks || []) {
      const metadata = task.metadata || {};
      const baseXp = metadata.xp || 25; // Default XP for completed task
      const priority = task.priority || 'medium';
      
      // Adjust XP based on priority
      let taskXp = baseXp;
      if (priority === 'high' || priority === '🔴 High') taskXp = 40;
      if (priority === 'low' || priority === '🟢 Low') taskXp = 15;

      // Check for identity tags in metadata
      const identityTags = metadata.identity || metadata.identities || [];
      const hasIdentity = Array.isArray(identityTags) && identityTags.length > 0;
      
      // Apply 2x multiplier if identity-tagged
      const multiplier = hasIdentity ? 2 : 1;
      const finalXp = taskXp * multiplier;
      const bonus = finalXp - taskXp;
      
      bonusXp += bonus;
      totalXp += finalXp;

      // Award XP using the migrated function
      const result = await awardXP("task_completed", {
        sourceType: "task",
        sourceId: task.id,
        notes: task.title,
        forceCrit: hasIdentity,
        customMultiplier: multiplier,
      });

      if (result.ok) {
        entries += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      entries,
      totalXp,
      bonusXp,
      message: bonusXp > 0 
        ? `Earned ${totalXp} XP (including ${bonusXp} bonus from identity alignment!)` 
        : `Earned ${totalXp} XP`,
    });
  } catch (err: any) {
    console.error("XP sweep error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to sweep XP",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get today's date for checking completion
    const today = new Date().toISOString().split('T')[0];

    // Query habits with completions
    const { data: habits, error } = await supabaseAdmin
      .from("habits")
      .select(`
        *,
        habit_completions (
          id,
          completed_at
        )
      `)
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Habits] Query error:", error);
      return NextResponse.json({ error: "Failed to fetch habits" }, { status: 500 });
    }

    // Process habits with completion status
    const processedHabits = (habits || []).map(h => {
      const completions = h.habit_completions || [];
      const lastCompletion = completions.length > 0 
        ? completions.sort((a: any, b: any) => 
            new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
          )[0]
        : null;
      
      const lastCompletedDate = lastCompletion?.completed_at 
        ? new Date(lastCompletion.completed_at).toISOString().split('T')[0]
        : null;
      
      const completedToday = lastCompletedDate === today;
      
      // Calculate streak (simplified - would need proper streak calculation in production)
      const streak = h.streak || 0;

      return {
        id: h.id,
        name: h.name,
        title: h.name,
        description: h.description,
        icon: h.icon,
        streak,
        lastCompleted: lastCompletedDate,
        lastCompletedAt: lastCompletion?.completed_at,
        frequency: h.frequency || 'daily',
        category: h.category,
        completedToday,
        streakAtRisk: streak >= 3 && !completedToday && new Date().getHours() >= 18,
        xp: h.xp,
        createdAt: h.created_at,
      };
    });

    return NextResponse.json({
      habits: processedHabits,
    });
  } catch (err: any) {
    console.error("[Habits] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}


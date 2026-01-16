// Quest Completion API - Awards XP for completed quests
import { logThirdBrainEvent } from "@/lib/third-brain/service";
// POST /api/quests/complete

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// XP rewards by quest type and difficulty
const XP_REWARDS = {
  life: { easy: 50, medium: 100, hard: 200 },
  growth: { easy: 75, medium: 150, hard: 300 },
  courage: { easy: 100, medium: 200, hard: 400 },
  kindness: { easy: 60, medium: 120, hard: 250 },
};

// Achievement thresholds
const ACHIEVEMENTS = {
  first_quest: { xp: 1, title: "Quest Beginner", description: "Complete your first quest" },
  quest_streak_3: { xp: 3, title: "Quest Explorer", description: "Complete 3 quests" },
  quest_streak_7: { xp: 7, title: "Quest Warrior", description: "Complete 7 quests" },
  quest_streak_30: { xp: 30, title: "Quest Legend", description: "Complete 30 quests" },
  courage_master: { xp: 10, title: "Courage Master", description: "Complete 10 courage quests" },
  kindness_hero: { xp: 10, title: "Kindness Hero", description: "Complete 10 kindness quests" },
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { questId, questType, questTitle, difficulty = "medium" } = body;

    if (!questId || !questType) {
      return NextResponse.json({ error: "Missing questId or questType" }, { status: 400 });
    }

    // Get user's internal ID
    const { data: user } = await supabase
      .from("users")
      .select("id, name")
      .eq("clerk_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if quest already completed today
    const today = new Date().toISOString().split("T")[0];
    const { data: existingCompletion } = await supabase
      .from("quest_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("quest_id", questId)
      .gte("completed_at", `${today}T00:00:00`)
      .single();

    if (existingCompletion) {
      return NextResponse.json({
        error: "Quest already completed today",
        alreadyCompleted: true
      }, { status: 400 });
    }

    // Calculate XP reward
    const typeRewards = XP_REWARDS[questType as keyof typeof XP_REWARDS] || XP_REWARDS.life;
    const xpAmount = typeRewards[difficulty as keyof typeof typeRewards] || typeRewards.medium;

    // Save quest completion
    await supabase.from("quest_completions").insert({
      user_id: userId,
      quest_id: questId,
      quest_type: questType,
      quest_title: questTitle,
      difficulty,
      xp_earned: xpAmount,
      completed_at: new Date().toISOString(),
    });

    // Award XP
    const { data: xpTx } = await supabase
      .from("xp_transactions")
      .insert({
        user_id: userId,
        amount: xpAmount,
        source: "quest_completion",
        description: `Completed quest: ${questTitle}`,
        metadata: { questId, questType, difficulty },
      })
      .select()
      .single();

    // Log to Third Brain
    await logThirdBrainEvent({
      userId,
      type: "quest_completed",
      source: "quests",
      title: `Quest: ${questTitle}`,
      summary: `+${xpAmount} XP (${questType}, ${difficulty})`,
      rawPayload: { questId, questType, difficulty, xpAwarded: xpAmount },
    });

    // Get total quest completions for achievements
    const { count: totalCompletions } = await supabase
      .from("quest_completions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Get type-specific completions
    const { count: typeCompletions } = await supabase
      .from("quest_completions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("quest_type", questType);

    // Check for new achievements
    const newAchievements: string[] = [];

    // Quest count achievements
    if (totalCompletions === 1) {
      newAchievements.push("first_quest");
    } else if (totalCompletions === 3) {
      newAchievements.push("quest_streak_3");
    } else if (totalCompletions === 7) {
      newAchievements.push("quest_streak_7");
    } else if (totalCompletions === 30) {
      newAchievements.push("quest_streak_30");
    }

    // Type-specific achievements
    if (questType === "courage" && typeCompletions === 10) {
      newAchievements.push("courage_master");
    } else if (questType === "kindness" && typeCompletions === 10) {
      newAchievements.push("kindness_hero");
    }

    // Award achievements
    for (const achievementKey of newAchievements) {
      const achievement = ACHIEVEMENTS[achievementKey as keyof typeof ACHIEVEMENTS];

      // Check if already has achievement
      const { data: existing } = await supabase
        .from("achievements")
        .select("id")
        .eq("user_id", userId)
        .eq("achievement_key", achievementKey)
        .single();

      if (!existing) {
        await supabase.from("achievements").insert({
          user_id: userId,
          achievement_key: achievementKey,
          title: achievement.title,
          description: achievement.description,
          earned_at: new Date().toISOString(),
        });

        // Bonus XP for achievement
        await supabase.from("xp_transactions").insert({
          user_id: userId,
          amount: 100,
          source: "achievement",
          description: `Achievement unlocked: ${achievement.title}`,
          metadata: { achievementKey },
        });
      }
    }

    // Update daily streak
    await updateDailyStreak(userId);

    // Get updated XP total
    const { data: xpData } = await supabase
      .from("xp_transactions")
      .select("amount")
      .eq("user_id", userId);

    const totalXP = (xpData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Calculate level
    const level = Math.floor(totalXP / 1000) + 1;
    const xpToNextLevel = 1000 - (totalXP % 1000);

    return NextResponse.json({
      success: true,
      xpAwarded: xpAmount,
      totalXP,
      level,
      xpToNextLevel,
      newAchievements: newAchievements.map(key => ACHIEVEMENTS[key as keyof typeof ACHIEVEMENTS]),
      message: `+${xpAmount} XP! Quest completed! 🎉`,
    });

  } catch (err: any) {
    console.error("Quest completion error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Helper to update daily streak
async function updateDailyStreak(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Check for existing streak
  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "daily")
    .single();

  if (!streak) {
    // Create new streak
    await supabase.from("streaks").insert({
      user_id: userId,
      type: "daily",
      count: 1,
      last_date: today,
    });
  } else if (streak.last_date === today) {
    // Already updated today, do nothing
  } else if (streak.last_date === yesterday) {
    // Continue streak
    await supabase
      .from("streaks")
      .update({ count: streak.count + 1, last_date: today })
      .eq("id", streak.id);
  } else {
    // Streak broken, reset
    await supabase
      .from("streaks")
      .update({ count: 1, last_date: today })
      .eq("id", streak.id);
  }
}

// GET - Get quest stats
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Get today's completions
    const { data: todayCompletions } = await supabase
      .from("quest_completions")
      .select("*")
      .eq("user_id", userId)
      .gte("completed_at", `${today}T00:00:00`);

    // Get total completions
    const { count: totalCompletions } = await supabase
      .from("quest_completions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Get streak
    const { data: streak } = await supabase
      .from("streaks")
      .select("count")
      .eq("user_id", userId)
      .eq("type", "daily")
      .single();

    return NextResponse.json({
      todayCompleted: (todayCompletions || []).length,
      totalCompleted: totalCompletions || 0,
      currentStreak: streak?.count || 0,
      todayCompletions: todayCompletions || [],
    });

  } catch (err: any) {
    console.error("Quest stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
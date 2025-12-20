import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";

// Activity XP mapping
const ACTIVITY_XP_MAP: Record<string, { amount: number; category: string }> = {
  habit_completed: { amount: 15, category: "DXP" },
  task_completed: { amount: 25, category: "DXP" },
  task_completed_high_priority: { amount: 40, category: "DXP" },
  journal_entry: { amount: 20, category: "DXP" },
  follow_up_sent: { amount: 20, category: "DXP" },
  morning_routine: { amount: 30, category: "DXP" },
  deal_won: { amount: 150, category: "AXP" },
  deal_advanced: { amount: 50, category: "AXP" },
  streak_milestone_7: { amount: 50, category: "MXP" },
  streak_milestone_14: { amount: 100, category: "MXP" },
  streak_milestone_30: { amount: 200, category: "MXP" },
  streak_milestone_60: { amount: 300, category: "MXP" },
  streak_milestone_90: { amount: 500, category: "MXP" },
  streak_milestone_100: { amount: 750, category: "MXP" },
  stoic_moment: { amount: 30, category: "IXP" },
  boundary_set: { amount: 40, category: "PXP" },
  difficult_conversation: { amount: 50, category: "PXP" },
  // Philosophy Dojo - Mentor Sessions
  mentor_session_started: { amount: 15, category: "IXP" },
  mentor_insight_received: { amount: 25, category: "IXP" },
  mentor_deep_conversation: { amount: 40, category: "IXP" },
  // Philosophy Dojo - Training
  philosophy_training_completed: { amount: 35, category: "IXP" },
  philosophy_skill_unlocked: { amount: 50, category: "IXP" },
  // Coach Engine v3.5
  coach_session_completed: { amount: 30, category: "PXP" },
  coach_session_excellent: { amount: 60, category: "PXP" },
  coach_session_mastery: { amount: 100, category: "PXP" },
  negotiation_practice: { amount: 40, category: "PXP" },
  emotional_coaching: { amount: 35, category: "IXP" },
  scenario_generated: { amount: 25, category: "MXP" },
  voice_analysis_completed: { amount: 30, category: "PXP" },
  multi_agent_session: { amount: 50, category: "PXP" },
  // Emotional Mastery XP (v3.6)
  coach_emotional_mastery: { amount: 10, category: "MXP" }, // Base amount, multiplied by transition quality
};

// Calculate if this is a crit (random chance)
function rollForCrit(): { wasCrit: boolean; multiplier: number } {
  const roll = Math.random();
  if (roll < 0.05) return { wasCrit: true, multiplier: 4 };
  if (roll < 0.15) return { wasCrit: true, multiplier: 3 };
  if (roll < 0.30) return { wasCrit: true, multiplier: 2 };
  return { wasCrit: false, multiplier: 1 };
}

/**
 * Award XP for an activity (migrated from Notion to Supabase)
 */
export async function awardXP(
  activity: string,
  options?: {
    forceCrit?: boolean;
    customMultiplier?: number;
    sourceType?: string;
    sourceId?: string;
    notes?: string;
  }
): Promise<{ ok: boolean; xpAwarded?: number; error?: string }> {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const activityData = ACTIVITY_XP_MAP[activity];
    if (!activityData) {
      return { ok: false, error: `Unknown activity: ${activity}` };
    }

    const { wasCrit, multiplier } = options?.forceCrit 
      ? { wasCrit: true, multiplier: options.customMultiplier || 2 }
      : rollForCrit();

    const baseXP = activityData.amount;
    const finalXP = Math.round(baseXP * multiplier);

    // Log to Supabase
    const { error } = await supabaseAdmin
      .from("xp_transactions")
      .insert({
        user_id: supabaseUserId,
        amount: finalXP,
        source: options?.sourceType || "manual",
        description: `${activity}: ${finalXP} XP (${activityData.category})${wasCrit ? " [CRIT!]" : ""}`,
        metadata: {
          activity,
          category: activityData.category,
          baseXP,
          finalXP,
          wasCrit,
          multiplier,
          sourceId: options?.sourceId,
          notes: options?.notes,
        },
      });

    if (error) {
      console.error("Failed to award XP:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, xpAwarded: finalXP };
  } catch (error: any) {
    console.error("XP award error:", error);
    return { ok: false, error: error.message || "Failed to award XP" };
  }
}

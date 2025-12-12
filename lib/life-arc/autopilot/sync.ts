// Life Arc Autopilot Sync with Autopilot Engine
// lib/life-arc/autopilot/sync.ts

import { supabaseAdmin } from "@/lib/supabase";
import { DailyFocusItem } from "./daily";

export interface SyncQuestsToAutopilotParams {
  userId: string;
  focusItems: DailyFocusItem[];
}

/**
 * Sync quests to Autopilot actions
 */
export async function syncQuestsToAutopilot(
  params: SyncQuestsToAutopilotParams
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", params.userId)
    .single();

  const dbUserId = userRow?.id || params.userId;

  for (const item of params.focusItems) {
    if (item.autopilotActionId) continue; // Already synced

    // Get quest details
    if (!item.questId) continue;

    const { data: quest } = await supabaseAdmin
      .from("life_arc_quests")
      .select("*, life_arcs(key, name)")
      .eq("id", item.questId)
      .single();

    if (!quest) continue;

    // Determine if quest should create Autopilot action
    const shouldCreateAction = shouldCreateAutopilotAction(quest, (quest.life_arcs as any)?.key);

    if (shouldCreateAction) {
      try {
        // Create Autopilot action (using existing autopilot system)
        const actionId = await createAutopilotActionForQuest(
          dbUserId,
          quest,
          (quest.life_arcs as any)?.key
        );

        if (actionId) {
          // Update daily focus with action ID
          const focusDate = new Date().toISOString().split("T")[0];
          await supabaseAdmin
            .from("life_arc_daily_focus")
            .update({
              autopilot_action_id: actionId,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", dbUserId)
            .eq("focus_date", focusDate)
            .eq("quest_id", item.questId);
        }
      } catch (err) {
        console.error(`[ArcAutopilotSync] Failed to create action for quest ${item.questId}:`, err);
      }
    }
  }
}

/**
 * Determine if quest should create Autopilot action
 */
function shouldCreateAutopilotAction(quest: any, arcKey?: string): boolean {
  // Create actions for actionable quests
  const actionableKeywords = [
    "send",
    "schedule",
    "call",
    "email",
    "follow up",
    "complete",
    "finish",
    "do",
    "make",
  ];

  const title = (quest.title || "").toLowerCase();
  const description = (quest.description || "").toLowerCase();

  return (
    actionableKeywords.some((keyword) => title.includes(keyword) || description.includes(keyword)) ||
    arcKey === "career_level_up" ||
    arcKey === "performance_push"
  );
}

/**
 * Create Autopilot action for quest
 */
async function createAutopilotActionForQuest(
  dbUserId: string,
  quest: any,
  arcKey?: string
): Promise<string | null> {
  try {
    // Check if autopilot_actions table exists
    const { data: action, error } = await supabaseAdmin
      .from("autopilot_actions")
      .insert({
        user_id: dbUserId,
        action_type: "life_arc_quest",
        title: quest.title,
        description: quest.description || `Complete: ${quest.title}`,
        status: "pending",
        priority: quest.impact || 3,
        metadata: {
          quest_id: quest.id,
          arc_key: arcKey,
          source: "life_arc_autopilot",
        },
      })
      .select("id")
      .single();

    if (error || !action) {
      console.warn("[ArcAutopilotSync] Autopilot actions table may not exist:", error);
      return null;
    }

    return action.id;
  } catch (err) {
    console.warn("[ArcAutopilotSync] Failed to create autopilot action:", err);
    return null;
  }
}





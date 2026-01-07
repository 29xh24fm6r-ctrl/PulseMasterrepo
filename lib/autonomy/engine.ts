/**
 * Autonomy Engine v1
 * lib/autonomy/engine.ts
 * 
 * Reads Third Brain insights and generates safe, suggested actions
 * for user approval. Does NOT auto-execute anything dangerous.
 */

import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson } from "@/lib/ai/call";
import { getOpenInsights, ThirdBrainInsight } from "@/lib/third-brain/service";

// ============================================
// TYPES
// ============================================

export type AutonomyActionType =
  | "task"
  | "follow_up"
  | "habit_nudge"
  | "reflection"
  | "briefing"
  | "draft_review";

export type AutonomyActionStatus =
  | "suggested"
  | "scheduled"
  | "ignored"
  | "completed";

export interface AutonomyAction {
  id: string;
  userId: string;
  type: AutonomyActionType;
  title: string;
  description?: string;
  relatedInsightId?: string | null;
  status: AutonomyActionStatus;
  scheduledFor?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActionInput {
  userId: string;
  type: AutonomyActionType;
  title: string;
  description?: string;
  relatedInsightId?: string;
  scheduledFor?: Date;
}

interface AIGeneratedAction {
  type: AutonomyActionType;
  title: string;
  description: string;
  relatedInsightId?: string;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new autonomy action
 */
export async function createAutonomyAction(
  input: CreateActionInput
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("autonomy_actions")
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        description: input.description || null,
        related_insight_id: input.relatedInsightId || null,
        scheduled_for: input.scheduledFor?.toISOString() || null,
        status: "suggested",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Autonomy] Error creating action:", error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error("[Autonomy] Exception creating action:", err);
    return null;
  }
}

/**
 * Get suggested actions for a user
 */
export async function getSuggestedActions(
  userId: string,
  limit: number = 10
): Promise<AutonomyAction[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("autonomy_actions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "suggested")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(mapRowToAction);
  } catch (err) {
    console.error("[Autonomy] Exception getting suggested actions:", err);
    return [];
  }
}

/**
 * Get actions by status
 */
export async function getActionsByStatus(
  userId: string,
  status: AutonomyActionStatus,
  limit: number = 20
): Promise<AutonomyAction[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("autonomy_actions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(mapRowToAction);
  } catch (err) {
    console.error("[Autonomy] Exception getting actions by status:", err);
    return [];
  }
}

/**
 * Update action status
 */
export async function updateActionStatus(
  actionId: string,
  status: AutonomyActionStatus,
  scheduledFor?: Date
): Promise<boolean> {
  try {
    const updateData: any = { status };
    if (scheduledFor) {
      updateData.scheduled_for = scheduledFor.toISOString();
    }

    const { error } = await supabaseAdmin
      .from("autonomy_actions")
      .update(updateData)
      .eq("id", actionId);

    return !error;
  } catch (err) {
    console.error("[Autonomy] Exception updating action status:", err);
    return false;
  }
}

/**
 * Delete an action
 */
export async function deleteAutonomyAction(actionId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("autonomy_actions")
      .delete()
      .eq("id", actionId);

    return !error;
  } catch (err) {
    console.error("[Autonomy] Exception deleting action:", err);
    return false;
  }
}

// ============================================
// AUTONOMY CYCLE
// ============================================

/**
 * Check if a similar action already exists
 */
async function actionExistsRecently(
  userId: string,
  type: AutonomyActionType,
  title: string,
  daysBack: number = 3
): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data } = await supabaseAdmin
    .from("autonomy_actions")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .ilike("title", `%${title.substring(0, 30)}%`)
    .in("status", ["suggested", "scheduled"])
    .gte("created_at", since.toISOString())
    .limit(1);

  return (data?.length || 0) > 0;
}

/**
 * Generate actions from open insights using AI
 */
async function generateActionsFromInsights(
  userId: string,
  insights: ThirdBrainInsight[]
): Promise<AIGeneratedAction[]> {
  if (insights.length === 0) {
    return [];
  }

  // Build insight summary for AI
  const insightSummary = insights.slice(0, 10).map((i) => ({
    id: i.id,
    kind: i.kind,
    title: i.title,
    description: i.description,
    severity: i.severity,
  }));

  const result = await callAIJson<AIGeneratedAction[]>({
    userId,
    feature: "autonomy_engine",
    systemPrompt: `You are the Pulse Autonomy Engine. You convert insights into small, safe, actionable suggestions.

Your actions should be:
- SMALL: Takes 5-15 minutes max
- SAFE: No external system changes (no sending emails, no API calls)
- CONCRETE: Specific enough to act on immediately
- HELPFUL: Directly addresses the insight

Action types:
- "task": A small todo item to complete
- "follow_up": A reminder to check on something/someone
- "habit_nudge": A gentle reminder about a habit
- "reflection": A prompt for journaling or thinking
- "briefing": A summary or preparation note

Output ONLY valid JSON array.`,
    userPrompt: `Given these open insights:

${JSON.stringify(insightSummary, null, 2)}

Generate 2-5 small, safe suggested actions. Each action should:
1. Be completable in under 15 minutes
2. NOT involve sending any external communications
3. Address one of the insights above

Output as JSON array:
[
  {
    "type": "task" | "follow_up" | "habit_nudge" | "reflection" | "briefing",
    "title": "Short action title (max 60 chars)",
    "description": "1-2 sentence explanation of what to do",
    "relatedInsightId": "uuid of the insight this relates to (optional)"
  }
]

Only output valid JSON array, no other text.`,
    maxTokens: 800,
    temperature: 0.4,
  });

  if (!result.success || !result.data || !Array.isArray(result.data)) {
    console.error("[Autonomy] Failed to generate actions:", result.error);
    return [];
  }

  // Validate and filter the results
  const validTypes: AutonomyActionType[] = [
    "task",
    "follow_up",
    "habit_nudge",
    "reflection",
    "briefing",
  ];

  return result.data
    .filter(
      (a) =>
        validTypes.includes(a.type as AutonomyActionType) &&
        a.title &&
        a.title.length > 0
    )
    .map((a) => ({
      type: a.type as AutonomyActionType,
      title: a.title.substring(0, 100),
      description: a.description?.substring(0, 500) || "",
      relatedInsightId: a.relatedInsightId,
    }));
}

/**
 * Generate a morning briefing action
 */
async function generateMorningBriefing(
  userId: string
): Promise<AIGeneratedAction | null> {
  // Check if we already have a briefing for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: existing } = await supabaseAdmin
    .from("autonomy_actions")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "briefing")
    .gte("created_at", today.toISOString())
    .limit(1);

  if (existing && existing.length > 0) {
    return null; // Already have a briefing today
  }

  // Get today's context
  const { data: todayEvents } = await supabaseAdmin
    .from("third_brain_events")
    .select("type, title, summary")
    .eq("user_id", userId)
    .gte("occurred_at", today.toISOString())
    .limit(10);

  const { data: openInsights } = await supabaseAdmin
    .from("third_brain_insights")
    .select("kind, title")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("severity", { ascending: false })
    .limit(5);

  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return {
    type: "briefing",
    title: `${dayOfWeek} Morning Focus`,
    description: `Today you have ${openInsights?.length || 0} open insights to review. ${todayEvents?.length || 0
      } activities logged so far. Take 5 minutes to check your Third Brain and set your intentions.`,
  };
}

/**
 * Main autonomy cycle - reads insights, generates actions
 */
export async function runAutonomyCycle(userId: string): Promise<{
  created: number;
  skipped: number;
}> {
  const result = { created: 0, skipped: 0 };

  try {
    console.log(`[Autonomy] Starting cycle for ${userId}`);

    // 1. Get open insights
    const insights = await getOpenInsights(userId, 20);

    // 2. Generate actions from insights
    const generatedActions = await generateActionsFromInsights(userId, insights);

    // 3. Check for duplicates and create actions
    for (const action of generatedActions) {
      const exists = await actionExistsRecently(userId, action.type, action.title, 3);

      if (exists) {
        result.skipped++;
        continue;
      }

      const actionId = await createAutonomyAction({
        userId,
        type: action.type,
        title: action.title,
        description: action.description,
        relatedInsightId: action.relatedInsightId,
      });

      if (actionId) {
        result.created++;
      }
    }

    // 4. Generate morning briefing if applicable
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 10) {
      const briefing = await generateMorningBriefing(userId);
      if (briefing) {
        const exists = await actionExistsRecently(userId, "briefing", briefing.title, 1);
        if (!exists) {
          await createAutonomyAction({
            userId,
            type: briefing.type,
            title: briefing.title,
            description: briefing.description,
          });
          result.created++;
        }
      }
    }

    // 5. Clean up old ignored actions (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await supabaseAdmin
      .from("autonomy_actions")
      .delete()
      .eq("user_id", userId)
      .eq("status", "ignored")
      .lt("created_at", sevenDaysAgo.toISOString());

    console.log(`[Autonomy] Cycle complete for ${userId}:`, result);
    return result;
  } catch (err) {
    console.error("[Autonomy] Exception in cycle:", err);
    return result;
  }
}

// ============================================
// HELPERS
// ============================================

function mapRowToAction(row: any): AutonomyAction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    relatedInsightId: row.related_insight_id,
    status: row.status,
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================
// QUICK ACTIONS
// ============================================

/**
 * Accept an action (mark as scheduled)
 */
export async function acceptAction(actionId: string): Promise<boolean> {
  return updateActionStatus(actionId, "scheduled");
}

/**
 * Ignore an action
 */
export async function ignoreAction(actionId: string): Promise<boolean> {
  return updateActionStatus(actionId, "ignored");
}

/**
 * Complete an action
 */
export async function completeAction(actionId: string): Promise<boolean> {
  return updateActionStatus(actionId, "completed");
}

/**
 * Get action counts by status for a user
 */
export async function getActionCounts(
  userId: string
): Promise<Record<AutonomyActionStatus, number>> {
  const counts: Record<AutonomyActionStatus, number> = {
    suggested: 0,
    scheduled: 0,
    ignored: 0,
    completed: 0,
  };

  try {
    const { data } = await supabaseAdmin
      .from("autonomy_actions")
      .select("status")
      .eq("user_id", userId);

    if (data) {
      for (const row of data) {
        if (row.status in counts) {
          counts[row.status as AutonomyActionStatus]++;
        }
      }
    }
  } catch (err) {
    console.error("[Autonomy] Exception getting counts:", err);
  }

  return counts;
}
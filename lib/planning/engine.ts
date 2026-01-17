/**
 * Day Planner Engine v1
 * lib/planning/engine.ts
 * 
 * Builds structured daily plans using Third Brain insights + Autonomy suggestions
 */

import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { callAIJson } from "@/lib/ai/call";
import { getOpenInsights } from "@/lib/third-brain/service";
import { getSuggestedActions } from "@/lib/autonomy/engine";

// ============================================
// TYPES
// ============================================

export type PlanItemType = "task" | "block" | "relationship" | "health" | "reflection";
export type PlanItemStatus = "planned" | "in_progress" | "completed" | "skipped";

export interface DayPlan {
  id: string;
  userId: string;
  date: string;
  summary: string | null;
  focusAreas: string[];
  energyNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanItem {
  id: string;
  userId: string;
  dayPlanId: string;
  type: PlanItemType;
  title: string;
  description: string | null;
  status: PlanItemStatus;
  scheduledFor: Date | null;
  priority: number;
  source: string | null;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DayPlanWithItems extends DayPlan {
  items: PlanItem[];
}

export interface DayPlanOptions {
  userId: string;
  date: Date;
}

interface AIGeneratedPlan {
  summary: string;
  focusAreas: string[];
  energyNotes: string;
  items: Array<{
    type: PlanItemType;
    title: string;
    description: string;
    priority: 1 | 2 | 3;
    scheduledFor?: string; // ISO time string
  }>;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get or create a day plan for a specific date
 */
export async function getOrCreateDayPlan(
  opts: DayPlanOptions
): Promise<{ dayPlanId: string; isNew: boolean }> {
  const dateStr = formatDateForDb(opts.date);

  // Check if plan exists
  const { data: existing } = await getSupabaseAdminRuntimeClient()
    .from("day_plans")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("date", dateStr)
    .single();

  if (existing) {
    return { dayPlanId: existing.id, isNew: false };
  }

  // Create new empty plan
  const { data: newPlan, error } = await getSupabaseAdminRuntimeClient()
    .from("day_plans")
    .insert({
      user_id: opts.userId,
      date: dateStr,
      summary: null,
      focus_areas: [],
      energy_notes: null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Planning] Error creating day plan:", error);
    throw new Error("Failed to create day plan");
  }

  return { dayPlanId: newPlan.id, isNew: true };
}

/**
 * Generate a full day plan using AI
 * Pulls from Third Brain insights and Autonomy suggestions
 */
export async function generateDayPlan(
  opts: DayPlanOptions
): Promise<{ dayPlanId: string; itemsCreated: number }> {
  const { dayPlanId, isNew } = await getOrCreateDayPlan(opts);
  const dateStr = formatDateForDb(opts.date);
  const dayOfWeek = opts.date.toLocaleDateString("en-US", { weekday: "long" });

  // Gather context
  const [insights, autonomyActions] = await Promise.all([
    getOpenInsights(opts.userId, 10),
    getSuggestedActions(opts.userId, 10),
  ]);

  // Get existing plan items (if regenerating)
  const { data: existingItems } = await getSupabaseAdminRuntimeClient()
    .from("plan_items")
    .select("id")
    .eq("day_plan_id", dayPlanId);

  // If plan already has items and isn't new, skip regeneration
  if (!isNew && existingItems && existingItems.length > 0) {
    return { dayPlanId, itemsCreated: 0 };
  }

  // Build context for AI
  const insightsSummary = insights.slice(0, 5).map((i) => ({
    kind: i.kind,
    title: i.title,
    description: i.description,
  }));

  const actionsSummary = autonomyActions.slice(0, 5).map((a) => ({
    type: a.type,
    title: a.title,
    description: a.description,
  }));

  // Generate plan with AI
  const aiResult = await callAIJson<AIGeneratedPlan>({
    userId: opts.userId,
    feature: "day_planner",
    systemPrompt: `You are the Pulse Day Planner. You create structured, realistic daily plans.

Your plans should be:
- REALISTIC: 3-7 items max, not overwhelming
- BALANCED: Mix of work, health, relationships
- TIME-AWARE: Consider energy levels throughout the day
- ACTIONABLE: Specific enough to do today

Item types:
- "task": Work/productivity item
- "block": Time block for focused work
- "relationship": Connect with someone
- "health": Exercise, rest, wellness
- "reflection": Journaling, meditation, thinking

Priority: 1 = critical, 2 = important, 3 = nice to have

Output ONLY valid JSON.`,
    userPrompt: `Create a day plan for ${dayOfWeek}, ${dateStr}.

CONTEXT - Open Insights:
${JSON.stringify(insightsSummary, null, 2)}

CONTEXT - Suggested Actions:
${JSON.stringify(actionsSummary, null, 2)}

Generate a realistic day plan with 4-7 items. Output as JSON:
{
  "summary": "1-2 sentence overview of the day's focus",
  "focusAreas": ["area1", "area2"], // 2-3 focus areas
  "energyNotes": "Brief note about pacing/energy management",
  "items": [
    {
      "type": "task" | "block" | "relationship" | "health" | "reflection",
      "title": "Item title",
      "description": "Brief description",
      "priority": 1 | 2 | 3,
      "scheduledFor": "HH:MM" // optional, 24h format
    }
  ]
}

Only output valid JSON, no other text.`,
    maxTokens: 1000,
    temperature: 0.5,
  });

  if (!aiResult.success || !aiResult.data) {
    console.error("[Planning] AI generation failed:", aiResult.error);
    // Create a basic fallback plan
    await getSupabaseAdminRuntimeClient()
      .from("day_plans")
      .update({
        summary: `Plan for ${dayOfWeek}`,
        focus_areas: ["Productivity", "Wellbeing"],
        energy_notes: "Start with high-energy tasks, wind down in the afternoon.",
      })
      .eq("id", dayPlanId);

    return { dayPlanId, itemsCreated: 0 };
  }

  const plan = aiResult.data;

  // Update day plan with summary
  await getSupabaseAdminRuntimeClient()
    .from("day_plans")
    .update({
      summary: plan.summary || null,
      focus_areas: plan.focusAreas || [],
      energy_notes: plan.energyNotes || null,
    })
    .eq("id", dayPlanId);

  // Create plan items
  let itemsCreated = 0;
  const validTypes: PlanItemType[] = ["task", "block", "relationship", "health", "reflection"];

  for (const item of plan.items || []) {
    if (!validTypes.includes(item.type as PlanItemType)) continue;
    if (!item.title) continue;

    // Parse scheduled time if provided
    let scheduledFor: string | null = null;
    if (item.scheduledFor && /^\d{1,2}:\d{2}$/.test(item.scheduledFor)) {
      const [hours, minutes] = item.scheduledFor.split(":").map(Number);
      const scheduled = new Date(opts.date);
      scheduled.setHours(hours, minutes, 0, 0);
      scheduledFor = scheduled.toISOString();
    }

    const { error } = await getSupabaseAdminRuntimeClient().from("plan_items").insert({
      user_id: opts.userId,
      day_plan_id: dayPlanId,
      type: item.type,
      title: item.title.substring(0, 200),
      description: item.description?.substring(0, 500) || null,
      status: "planned",
      scheduled_for: scheduledFor,
      priority: item.priority || 2,
      source: "ai_generated",
    });

    if (!error) itemsCreated++;
  }

  // Also add any pending autonomy actions as plan items
  for (const action of autonomyActions.slice(0, 3)) {
    const exists = plan.items?.some(
      (i) => i.title.toLowerCase().includes(action.title.toLowerCase().substring(0, 20))
    );
    if (exists) continue;

    const typeMap: Record<string, PlanItemType> = {
      task: "task",
      follow_up: "relationship",
      habit_nudge: "health",
      reflection: "reflection",
      briefing: "task",
    };

    await getSupabaseAdminRuntimeClient().from("plan_items").insert({
      user_id: opts.userId,
      day_plan_id: dayPlanId,
      type: typeMap[action.type] || "task",
      title: action.title,
      description: action.description || null,
      status: "planned",
      priority: 2,
      source: "autonomy",
      source_id: action.id,
    });
    itemsCreated++;
  }

  console.log(`[Planning] Generated plan for ${opts.userId}: ${itemsCreated} items`);
  return { dayPlanId, itemsCreated };
}

/**
 * Get a day plan with all its items
 */
export async function getDayPlanWithItems(
  userId: string,
  date: Date
): Promise<DayPlanWithItems | null> {
  const dateStr = formatDateForDb(date);

  const { data: plan } = await getSupabaseAdminRuntimeClient()
    .from("day_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .single();

  if (!plan) return null;

  const { data: items } = await getSupabaseAdminRuntimeClient()
    .from("plan_items")
    .select("*")
    .eq("day_plan_id", plan.id)
    .order("priority", { ascending: true })
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return {
    id: plan.id,
    userId: plan.user_id,
    date: plan.date,
    summary: plan.summary,
    focusAreas: plan.focus_areas || [],
    energyNotes: plan.energy_notes,
    createdAt: new Date(plan.created_at),
    updatedAt: new Date(plan.updated_at),
    items: (items || []).map(mapRowToItem),
  };
}

/**
 * Get today's plan
 */
export async function getTodaysPlan(userId: string): Promise<DayPlanWithItems | null> {
  return getDayPlanWithItems(userId, new Date());
}

/**
 * Update a plan item's status
 */
export async function updatePlanItemStatus(
  itemId: string,
  status: PlanItemStatus
): Promise<boolean> {
  const { error } = await getSupabaseAdminRuntimeClient()
    .from("plan_items")
    .update({ status })
    .eq("id", itemId);

  return !error;
}

/**
 * Add a manual item to a day plan
 */
export async function addPlanItem(
  dayPlanId: string,
  userId: string,
  item: {
    type: PlanItemType;
    title: string;
    description?: string;
    scheduledFor?: Date;
    priority?: number;
  }
): Promise<string | null> {
  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("plan_items")
    .insert({
      user_id: userId,
      day_plan_id: dayPlanId,
      type: item.type,
      title: item.title,
      description: item.description || null,
      scheduled_for: item.scheduledFor?.toISOString() || null,
      priority: item.priority || 2,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Planning] Error adding item:", error);
    return null;
  }

  return data.id;
}

/**
 * Delete a plan item
 */
export async function deletePlanItem(itemId: string): Promise<boolean> {
  const { error } = await getSupabaseAdminRuntimeClient()
    .from("plan_items")
    .delete()
    .eq("id", itemId);

  return !error;
}

/**
 * Get plan stats for a date range
 */
export async function getPlanStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalPlans: number;
  totalItems: number;
  completedItems: number;
  completionRate: number;
}> {
  const startStr = formatDateForDb(startDate);
  const endStr = formatDateForDb(endDate);

  const { data: plans } = await getSupabaseAdminRuntimeClient()
    .from("day_plans")
    .select("id")
    .eq("user_id", userId)
    .gte("date", startStr)
    .lte("date", endStr);

  if (!plans || plans.length === 0) {
    return { totalPlans: 0, totalItems: 0, completedItems: 0, completionRate: 0 };
  }

  const planIds = plans.map((p) => p.id);

  const { data: items } = await getSupabaseAdminRuntimeClient()
    .from("plan_items")
    .select("status")
    .in("day_plan_id", planIds);

  const totalItems = items?.length || 0;
  const completedItems = items?.filter((i) => i.status === "completed").length || 0;

  return {
    totalPlans: plans.length,
    totalItems,
    completedItems,
    completionRate: totalItems > 0 ? completedItems / totalItems : 0,
  };
}

// ============================================
// HELPERS
// ============================================

function formatDateForDb(date: Date): string {
  return date.toISOString().split("T")[0];
}

function mapRowToItem(row: any): PlanItem {
  return {
    id: row.id,
    userId: row.user_id,
    dayPlanId: row.day_plan_id,
    type: row.type,
    title: row.title,
    description: row.description,
    status: row.status,
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : null,
    priority: row.priority,
    source: row.source,
    sourceId: row.source_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
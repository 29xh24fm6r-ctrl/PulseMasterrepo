// Weekly Life Arc Autopilot
// lib/life-arc/autopilot/weekly.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getLifeArcPlan } from "../planner";
import { llmComplete } from "@/lib/llm/client";

export interface WeeklyObjective {
  id: string;
  arcId: string;
  weekStartDate: string;
  summary: string;
  targetQuests: number;
}

export interface WeeklyAutopilotResult {
  objectives: WeeklyObjective[];
}

/**
 * Get Monday of the week for a given date
 */
function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

/**
 * Run weekly life arc autopilot
 */
export async function runWeeklyLifeArcAutopilot(
  userId: string,
  weekStartDate?: string
): Promise<WeeklyAutopilotResult> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Determine week start date
  const weekStart = weekStartDate || getWeekStartDate(new Date());

  // Get life arc plan
  const plan = await getLifeArcPlan(userId);

  if (plan.arcs.length === 0) {
    return { objectives: [] };
  }

  // Get latest checkpoints for progress context
  const objectives: WeeklyObjective[] = [];

  for (const arc of plan.arcs) {
    // Get latest checkpoint
    const { data: latestCheckpoint } = await supabaseAdmin
      .from("life_arc_checkpoints")
      .select("*")
      .eq("arc_id", arc.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get open quests
    const openQuests = (plan.questsByArc[arc.id] || []).filter(
      (q) => q.status === "open" || q.status === "in_progress"
    );

    // Generate weekly objective using LLM
    const objectivePrompt = `Generate a weekly objective for this Life Arc:

Arc: ${arc.name}
Description: ${arc.description || ""}
Key: ${arc.key}
Priority: ${arc.priority}
Progress: ${latestCheckpoint?.progress_score || 0}%
Open Quests: ${openQuests.length}

Create a concise, actionable weekly objective (1-2 sentences) and suggest how many quests to target this week (3-7).

Output JSON:
{
  "summary": "Weekly objective in human language",
  "target_quests": number
}`;

    try {
      const response = await llmComplete(objectivePrompt, {
        model: "gpt-4o-mini",
        temperature: 0.7,
        json: true,
        max_tokens: 200,
      });

      const parsed = typeof response === "string" ? JSON.parse(response) : response;
      const summary = parsed.summary || generateDefaultObjective(arc, openQuests.length);
      const targetQuests = Math.max(3, Math.min(7, parsed.target_quests || 5));

      // Upsert objective
      const { data: objective, error } = await supabaseAdmin
        .from("life_arc_objectives")
        .upsert(
          {
            user_id: dbUserId,
            arc_id: arc.id,
            week_start_date: weekStart,
            summary,
            target_quests: targetQuests,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,arc_id,week_start_date",
          }
        )
        .select("*")
        .single();

      if (objective && !error) {
        objectives.push({
          id: objective.id,
          arcId: objective.arc_id,
          weekStartDate: objective.week_start_date,
          summary: objective.summary,
          targetQuests: objective.target_quests,
        });
      }
    } catch (err) {
      console.error(`[WeeklyAutopilot] Failed to generate objective for arc ${arc.id}:`, err);
      // Use default objective
      const defaultSummary = generateDefaultObjective(arc, openQuests.length);
      const { data: objective } = await supabaseAdmin
        .from("life_arc_objectives")
        .upsert(
          {
            user_id: dbUserId,
            arc_id: arc.id,
            week_start_date: weekStart,
            summary: defaultSummary,
            target_quests: 5,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,arc_id,week_start_date",
          }
        )
        .select("*")
        .single();

      if (objective) {
        objectives.push({
          id: objective.id,
          arcId: objective.arc_id,
          weekStartDate: objective.week_start_date,
          summary: objective.summary,
          targetQuests: objective.target_quests,
        });
      }
    }
  }

  return { objectives };
}

/**
 * Generate default objective if LLM fails
 */
function generateDefaultObjective(arc: any, openQuestsCount: number): string {
  const defaults: Record<string, string> = {
    healing: "Focus on emotional regulation and self-care. Complete 3-5 healing quests this week.",
    emotional_stability: "Maintain emotional balance. Complete 3-4 stability quests this week.",
    career_level_up: "Move forward on career missions. Complete 4-6 career quests this week.",
    career_transition: "Prepare for next career phase. Complete 3-5 transition quests this week.",
    financial_reset: "Take steps toward financial stability. Complete 2-4 finance quests this week.",
    relationship_restore: "Work on key relationships. Complete 2-3 relationship quests this week.",
    performance_push: "Accelerate performance. Complete 5-7 performance quests this week.",
    identity_rebuild: "Clarify values and identity. Complete 3-4 identity quests this week.",
    health_rebuild: "Rebuild health foundations. Complete 3-5 health quests this week.",
  };

  return defaults[arc.key] || `Make progress on ${arc.name}. Complete ${Math.min(5, openQuestsCount)} quests this week.`;
}





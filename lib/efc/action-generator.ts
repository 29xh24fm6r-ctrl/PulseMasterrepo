// Executive Function Cortex: Action Generator
// Analyzes context and generates recommended actions


import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { CognitiveMesh } from "../cognitive-mesh";
import {
  GeneratedAction,
  ActionType,
  ActionUrgency,
  ActionImportance,
  EnergyLevel,
  TimeBlock,
  GenerateActionsInput,
} from "./types";



function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

// ============================================
// ACTION GENERATION PROMPT
// ============================================

const ACTION_GENERATION_PROMPT = `You are an executive function AI that analyzes a user's context and generates concrete, actionable recommendations.

Given the user's current context (calendar, tasks, commitments, knowledge, energy state), generate a list of recommended actions.

For each action, provide:
- action_type: task | communication | meeting | follow_up | decision | research | reflection | habit | health | admin
- title: Clear, actionable title (start with verb)
- description: Brief explanation of what to do
- reasoning: Why this action is recommended NOW (based on context)
- urgency: immediate | today | this_week | someday
- importance: critical | high | medium | low
- estimated_minutes: How long it will take (5-240)
- energy_required: high | medium | low | recovery
- best_time_block: morning | midday | afternoon | evening | anytime
- confidence: 0.0-1.0 how confident you are this is the right action

Guidelines:
- Generate 3-8 actions, prioritizing quality over quantity
- Focus on actions that move important things forward
- Consider the user's energy state and time of day
- Look for things that are overdue or at risk
- Identify follow-ups that are needed
- Surface opportunities from the context
- Be specific - "Email John about Q4 report" not "Do emails"
- Consider dependencies between actions

Output JSON array of actions.`;

// ============================================
// CONTEXT GATHERING
// ============================================

async function gatherContext(
  userId: string,
  input: GenerateActionsInput
): Promise<string> {
  const supabase = getSupabase();
  const parts: string[] = [];
  const now = new Date();

  // Get time context
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  parts.push(`Current time: ${now.toLocaleString()} (${timeOfDay})`);

  // Get calendar events
  if (input.include_calendar !== false) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const { data: events } = await supabase
      .from("calendar_events")
      .select("title, start_time, end_time, attendees")
      .eq("user_id", userId)
      .gte("start_time", todayStart)
      .lte("start_time", todayEnd)
      .order("start_time");

    if (events?.length) {
      parts.push("\n📅 Today's Calendar:");
      for (const e of events) {
        const time = new Date(e.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        parts.push(`- ${time}: ${e.title}${e.attendees?.length ? ` (with ${e.attendees.join(", ")})` : ""}`);
      }
    }
  }

  // Get pending tasks
  if (input.include_tasks !== false) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, priority, due_date, status")
      .eq("user_id", userId)
      .in("status", ["pending", "in_progress"])
      .order("priority", { ascending: false })
      .limit(15);

    if (tasks?.length) {
      parts.push("\n📋 Pending Tasks:");
      for (const t of tasks) {
        const dueStr = t.due_date ? ` (due: ${new Date(t.due_date).toLocaleDateString()})` : "";
        const overdue = t.due_date && new Date(t.due_date) < now ? " ⚠️ OVERDUE" : "";
        parts.push(`- [${t.priority}] ${t.title}${dueStr}${overdue}`);
      }
    }
  }

  // Get active commitments
  if (input.include_commitments !== false) {
    const { data: commitments } = await supabase
      .from("efc_commitments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("due_at", { ascending: true })
      .limit(10);

    if (commitments?.length) {
      parts.push("\n🤝 Active Commitments:");
      for (const c of commitments) {
        const dueStr = c.due_at ? ` (due: ${new Date(c.due_at).toLocaleDateString()})` : "";
        const toStr = c.made_to ? ` to ${c.made_to}` : "";
        parts.push(`- ${c.title}${toStr}${dueStr} - ${c.progress}% complete`);
      }
    }
  }

  // Get relevant knowledge from Cognitive Mesh
  if (input.context_query) {
    try {
      const context = await CognitiveMesh.buildContext(userId, {
        query: input.context_query,
        entityIds: input.entity_ids,
        includeRecentFragments: true,
      });

      if (context.fragments.length > 0) {
        parts.push("\n🧠 Relevant Context:");
        for (const f of context.fragments.slice(0, 5)) {
          parts.push(`- [${f.fragment_type}] ${f.content.substring(0, 150)}`);
        }
      }

      if (context.entities.length > 0) {
        parts.push("\n👥 Related Entities:");
        for (const e of context.entities.slice(0, 5)) {
          parts.push(`- ${e.entity_type}: ${e.name}`);
        }
      }
    } catch (e) {
      console.error("Failed to get cognitive mesh context:", e);
    }
  }

  // Get recent energy state
  const { data: energyState } = await supabase
    .from("efc_energy_states")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  if (energyState) {
    parts.push(`\n⚡ Energy State: ${energyState.energy_level} (${energyState.trend || "stable"})`);
    if (energyState.optimal_task_types?.length) {
      parts.push(`Good for: ${energyState.optimal_task_types.join(", ")}`);
    }
  }

  // Get recent insights from Third Brain
  const { data: insights } = await supabase
    .from("tb_insights")
    .select("title, body")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(3);

  if (insights?.length) {
    parts.push("\n💡 Recent Insights:");
    for (const i of insights) {
      parts.push(`- ${i.title}: ${i.body.substring(0, 100)}`);
    }
  }

  return parts.join("\n");
}

// ============================================
// ACTION GENERATION
// ============================================

export async function generateActions(
  userId: string,
  input: GenerateActionsInput = {}
): Promise<GeneratedAction[]> {
  // Gather context
  const context = await gatherContext(userId, input);

  // Generate actions with GPT
  const openai = await getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: ACTION_GENERATION_PROMPT },
      {
        role: "user",
        content: `Here is the user's current context:\n\n${context}\n\nTime horizon: ${input.time_horizon || "today"}\nMax actions: ${input.max_actions || 6}\n\nGenerate recommended actions as a JSON array.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    const actions = parsed.actions || parsed;

    // Add IDs and validate
    return (Array.isArray(actions) ? actions : []).map((a: any) => ({
      id: crypto.randomUUID(),
      action_type: validateActionType(a.action_type),
      title: a.title || "Untitled action",
      description: a.description || "",
      reasoning: a.reasoning || "",
      urgency: validateUrgency(a.urgency),
      importance: validateImportance(a.importance),
      estimated_minutes: Math.min(240, Math.max(5, a.estimated_minutes || 30)),
      energy_required: validateEnergy(a.energy_required),
      best_time_block: validateTimeBlock(a.best_time_block),
      dependencies: a.dependencies || [],
      related_entity_ids: a.related_entity_ids || [],
      related_fragment_ids: a.related_fragment_ids || [],
      confidence: Math.min(1, Math.max(0, a.confidence || 0.7)),
      metadata: {},
    }));
  } catch (e) {
    console.error("Failed to parse actions:", e);
    return [];
  }
}

// ============================================
// STORE ACTIONS
// ============================================

export async function storeGeneratedActions(
  userId: string,
  actions: GeneratedAction[]
): Promise<string[]> {
  const supabase = getSupabase();
  const ids: string[] = [];

  for (const action of actions) {
    const { data, error } = await supabase
      .from("efc_generated_actions")
      .insert({
        id: action.id,
        user_id: userId,
        action_type: action.action_type,
        title: action.title,
        description: action.description,
        reasoning: action.reasoning,
        urgency: action.urgency,
        importance: action.importance,
        estimated_minutes: action.estimated_minutes,
        energy_required: action.energy_required,
        best_time_block: action.best_time_block,
        dependencies: action.dependencies,
        related_entity_ids: action.related_entity_ids,
        related_fragment_ids: action.related_fragment_ids,
        confidence: action.confidence,
        priority_score: 50, // Will be calculated by priority engine
        metadata: action.metadata,
        status: "suggested",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select("id")
      .single();

    if (!error && data) {
      ids.push(data.id);
    }
  }

  return ids;
}

// ============================================
// GET SUGGESTED ACTIONS
// ============================================

export async function getSuggestedActions(
  userId: string,
  options: {
    limit?: number;
    urgency?: ActionUrgency;
    minPriority?: number;
    actionTypes?: ActionType[];
  } = {}
): Promise<GeneratedAction[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("efc_generated_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "suggested")
    .order("priority_score", { ascending: false });

  if (options.urgency) {
    query = query.eq("urgency", options.urgency);
  }
  if (options.minPriority) {
    query = query.gte("priority_score", options.minPriority);
  }
  if (options.actionTypes?.length) {
    query = query.in("action_type", options.actionTypes);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================
// UPDATE ACTION STATUS
// ============================================

export async function updateActionStatus(
  userId: string,
  actionId: string,
  status: "accepted" | "rejected" | "completed" | "deferred"
): Promise<void> {
  const supabase = getSupabase();
  const updates: any = { status };

  if (status === "accepted") {
    updates.accepted_at = new Date().toISOString();
  } else if (status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  await supabase
    .from("efc_generated_actions")
    .update(updates)
    .eq("id", actionId)
    .eq("user_id", userId);
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateActionType(type: string): ActionType {
  const valid: ActionType[] = ["task", "communication", "meeting", "follow_up", "decision", "research", "reflection", "habit", "health", "admin"];
  return valid.includes(type as ActionType) ? (type as ActionType) : "task";
}

function validateUrgency(urgency: string): ActionUrgency {
  const valid: ActionUrgency[] = ["immediate", "today", "this_week", "someday"];
  return valid.includes(urgency as ActionUrgency) ? (urgency as ActionUrgency) : "today";
}

function validateImportance(importance: string): ActionImportance {
  const valid: ActionImportance[] = ["critical", "high", "medium", "low"];
  return valid.includes(importance as ActionImportance) ? (importance as ActionImportance) : "medium";
}

function validateEnergy(energy: string): EnergyLevel {
  const valid: EnergyLevel[] = ["high", "medium", "low", "recovery"];
  return valid.includes(energy as EnergyLevel) ? (energy as EnergyLevel) : "medium";
}

function validateTimeBlock(block: string): TimeBlock {
  const valid: TimeBlock[] = ["morning", "midday", "afternoon", "evening", "anytime"];
  return valid.includes(block as TimeBlock) ? (block as TimeBlock) : "anytime";
}

// ============================================
// EXPORTS
// ============================================

export const ActionGenerator = {
  generateActions,
  storeGeneratedActions,
  getSuggestedActions,
  updateActionStatus,
};

export default ActionGenerator;
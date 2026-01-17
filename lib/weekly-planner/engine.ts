/**
 * Weekly Planning Engine v1
 * lib/weekly-planner/engine.ts
 * 
 * AI-powered weekly planning with goals, priorities, and review
 */

import { supabaseAdmin } from "@/lib/supabase";
import { getOpenAI } from "@/services/ai/openai";

// ============================================
// TYPES
// ============================================

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  theme?: string;
  topPriorities: WeeklyPriority[];
  goals: WeeklyGoal[];
  timeBlocks: TimeBlock[];
  reflections?: WeeklyReflection;
  status: "planning" | "active" | "completed" | "reviewed";
  aiSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyPriority {
  id: string;
  title: string;
  category: "work" | "personal" | "health" | "relationships" | "growth";
  importance: 1 | 2 | 3;
  completed: boolean;
  notes?: string;
}

export interface WeeklyGoal {
  id: string;
  title: string;
  targetMetric?: string;
  targetValue?: number;
  currentValue?: number;
  completed: boolean;
}

export interface TimeBlock {
  id: string;
  dayOfWeek: number; // 0-6
  startHour: number;
  endHour: number;
  activity: string;
  category: "focus" | "meetings" | "admin" | "personal" | "buffer";
}

export interface WeeklyReflection {
  wins: string[];
  challenges: string[];
  lessons: string[];
  energyLevel: number; // 1-10
  productivityRating: number; // 1-10
  nextWeekFocus?: string;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get or create weekly plan
 */
export async function getOrCreateWeeklyPlan(userId: string, weekStart?: Date): Promise<WeeklyPlan> {
  const start = weekStart || getWeekStart(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  // Check for existing
  const { data: existing } = await supabaseAdmin
    .from("weekly_plans")
    .select("*")
    .eq("user_id", userId)
    .gte("week_start", start.toISOString().split("T")[0])
    .lte("week_start", start.toISOString().split("T")[0])
    .single();

  if (existing) return mapWeeklyPlan(existing);

  // Create new
  const { data: created, error } = await supabaseAdmin
    .from("weekly_plans")
    .insert({
      user_id: userId,
      week_start: start.toISOString().split("T")[0],
      week_end: end.toISOString().split("T")[0],
      top_priorities: [] as any,
      goals: [] as any,
      time_blocks: getDefaultTimeBlocks() as any,
      status: "planning",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !created) {
    throw new Error("Failed to create weekly plan");
  }

  return mapWeeklyPlan(created);
}

/**
 * Update weekly plan
 */
export async function updateWeeklyPlan(
  userId: string,
  planId: string,
  updates: Partial<{
    theme: string;
    topPriorities: WeeklyPriority[];
    goals: WeeklyGoal[];
    timeBlocks: TimeBlock[];
    status: WeeklyPlan["status"];
  }>
): Promise<WeeklyPlan | null> {
  const record: any = { updated_at: new Date().toISOString() };

  if (updates.theme !== undefined) record.theme = updates.theme;
  if (updates.topPriorities) record.top_priorities = updates.topPriorities;
  if (updates.goals) record.goals = updates.goals;
  if (updates.timeBlocks) record.time_blocks = updates.timeBlocks;
  if (updates.status) record.status = updates.status;

  const { data, error } = await supabaseAdmin
    .from("weekly_plans")
    .update(record)
    .eq("id", planId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) return null;
  return mapWeeklyPlan(data);
}

/**
 * Save weekly reflection
 */
export async function saveWeeklyReflection(
  userId: string,
  planId: string,
  reflection: WeeklyReflection
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("weekly_plans")
    .update({
      reflections: reflection as any,
      status: "reviewed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("user_id", userId);

  return !error;
}

/**
 * Get past weekly plans
 */
export async function getPastWeeklyPlans(userId: string, limit = 8): Promise<WeeklyPlan[]> {
  const { data, error } = await supabaseAdmin
    .from("weekly_plans")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapWeeklyPlan);
}

/**
 * Generate AI weekly plan suggestions
 */
export async function generateWeeklyPlanSuggestions(
  userId: string,
  context: {
    calendarEvents?: any[];
    pendingTasks?: any[];
    relationships?: any[];
    lastWeekReflection?: WeeklyReflection;
  }
): Promise<{
  suggestedTheme: string;
  suggestedPriorities: WeeklyPriority[];
  suggestedGoals: WeeklyGoal[];
  aiAdvice: string;
}> {
  const prompt = `You are a productivity coach helping plan the week ahead.

CONTEXT:
- Calendar Events: ${context.calendarEvents?.length || 0} scheduled
- Pending Tasks: ${context.pendingTasks?.length || 0} items
- Key Relationships needing attention: ${context.relationships?.length || 0}
${context.lastWeekReflection ? `
- Last Week Energy: ${context.lastWeekReflection.energyLevel}/10
- Last Week Productivity: ${context.lastWeekReflection.productivityRating}/10
- Last Week Lessons: ${context.lastWeekReflection.lessons?.join(", ") || "None"}
- Last Week's Next Focus: ${context.lastWeekReflection.nextWeekFocus || "Not set"}
` : ""}

Generate a weekly plan with:
1. A theme (3-5 words capturing the week's focus)
2. Top 3 priorities (mix of work and personal)
3. 2-3 measurable goals
4. Brief coaching advice

Respond in JSON:
{
  "theme": "string",
  "priorities": [
    { "title": "string", "category": "work|personal|health|relationships|growth", "importance": 1-3 }
  ],
  "goals": [
    { "title": "string", "targetMetric": "string", "targetValue": number }
  ],
  "advice": "2-3 sentences of coaching"
}`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return {
      suggestedTheme: result.theme || "Focused Progress",
      suggestedPriorities: (result.priorities || []).map((p: any, i: number) => ({
        id: `sug-${i}`,
        title: p.title,
        category: p.category || "work",
        importance: p.importance || 2,
        completed: false,
      })),
      suggestedGoals: (result.goals || []).map((g: any, i: number) => ({
        id: `goal-${i}`,
        title: g.title,
        targetMetric: g.targetMetric,
        targetValue: g.targetValue,
        currentValue: 0,
        completed: false,
      })),
      aiAdvice: result.advice || "Focus on what matters most this week.",
    };
  } catch (err) {
    console.error("[WeeklyPlanner] AI error:", err);
    return {
      suggestedTheme: "Productive Week",
      suggestedPriorities: [],
      suggestedGoals: [],
      aiAdvice: "Plan your top 3 priorities and protect time for deep work.",
    };
  }
}

/**
 * Generate weekly review summary
 */
export async function generateWeeklyReview(
  userId: string,
  planId: string
): Promise<string | null> {
  const { data: plan } = await supabaseAdmin
    .from("weekly_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", userId)
    .single();

  if (!plan) return null;

  const priorities = (plan.top_priorities as unknown as WeeklyPriority[]) || [];
  const goals = (plan.goals as unknown as WeeklyGoal[]) || [];
  const completedPriorities = priorities.filter((p: any) => p.completed).length;
  const completedGoals = goals.filter((g: any) => g.completed).length;

  const prompt = `Summarize this week's performance:

Theme: ${plan.theme || "Not set"}
Priorities: ${completedPriorities}/${priorities.length} completed
Goals: ${completedGoals}/${goals.length} achieved

Priorities:
${priorities.map((p: any) => `- [${p.completed ? "✓" : " "}] ${p.title}`).join("\n")}

Goals:
${goals.map((g: any) => `- [${g.completed ? "✓" : " "}] ${g.title}`).join("\n")}

Write a brief (3-4 sentence) encouraging summary highlighting wins and areas for improvement.`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    const summary = completion.choices[0].message.content;

    // Save summary
    await supabaseAdmin
      .from("weekly_plans")
      .update({ ai_summary: summary })
      .eq("id", planId);

    return summary;
  } catch (err) {
    console.error("[WeeklyPlanner] Review error:", err);
    return null;
  }
}

// ============================================
// HELPERS
// ============================================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDefaultTimeBlocks(): TimeBlock[] {
  return [
    { id: "tb-1", dayOfWeek: 1, startHour: 9, endHour: 12, activity: "Deep Work", category: "focus" },
    { id: "tb-2", dayOfWeek: 1, startHour: 14, endHour: 17, activity: "Meetings", category: "meetings" },
    { id: "tb-3", dayOfWeek: 2, startHour: 9, endHour: 12, activity: "Deep Work", category: "focus" },
    { id: "tb-4", dayOfWeek: 3, startHour: 9, endHour: 12, activity: "Deep Work", category: "focus" },
    { id: "tb-5", dayOfWeek: 4, startHour: 9, endHour: 12, activity: "Deep Work", category: "focus" },
    { id: "tb-6", dayOfWeek: 5, startHour: 9, endHour: 12, activity: "Deep Work", category: "focus" },
    { id: "tb-7", dayOfWeek: 5, startHour: 14, endHour: 16, activity: "Weekly Review", category: "admin" },
  ];
}

function mapWeeklyPlan(row: any): WeeklyPlan {
  return {
    id: row.id,
    userId: row.user_id,
    weekStart: new Date(row.week_start),
    weekEnd: new Date(row.week_end),
    theme: row.theme,
    topPriorities: (row.top_priorities as unknown as WeeklyPriority[]) || [],
    goals: (row.goals as unknown as WeeklyGoal[]) || [],
    timeBlocks: (row.time_blocks as unknown as TimeBlock[]) || [],
    reflections: row.reflections as unknown as WeeklyReflection,
    status: row.status,
    aiSummary: row.ai_summary,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
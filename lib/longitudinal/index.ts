// Longitudinal Modeling Library
import { createClient } from "@supabase/supabase-js";
import { LLM } from "../llm/client";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface Snapshot {
  id: string;
  user_id: string;
  snapshot_type: "weekly" | "monthly" | "quarterly" | "yearly";
  period_start: string;
  period_end: string;
  avg_emotional_valence?: number;
  emotional_volatility?: number;
  dominant_emotions: string[];
  tasks_completed: number;
  avg_energy_level?: number;
  metrics_data: Record<string, any>;
  narrative_summary?: string;
}

export interface Trend {
  id: string;
  user_id: string;
  trend_type: "improving" | "declining" | "stable" | "cyclical";
  metric_name: string;
  description: string;
  confidence: number;
  slope?: number;
  data_points: Array<{ date: string; value: number }>;
}

export interface Chapter {
  id: string;
  user_id: string;
  chapter_title: string;
  start_date: string;
  end_date?: string;
  status: "active" | "completed" | "abandoned";
  primary_focus?: string;
  themes: string[];
  achievements: string[];
}

export interface Milestone {
  id: string;
  user_id: string;
  milestone_type: string;
  title: string;
  description?: string;
  occurred_at: string;
  significance_score: number;
}

export interface Trajectory {
  id: string;
  user_id: string;
  attribute_name: string;
  category?: string;
  current_level: number;
  target_level?: number;
  growth_rate?: number;
  history: Array<{ date: string; level: number; note?: string }>;
}

export async function createSnapshot(userId: string, type: "weekly" | "monthly" | "quarterly" | "yearly"): Promise<Snapshot> {
  const supabase = getSupabase();
  const now = new Date();
  let periodStart: Date;

  switch (type) {
    case "weekly": periodStart = new Date(now); periodStart.setDate(now.getDate() - 7); break;
    case "monthly": periodStart = new Date(now); periodStart.setMonth(now.getMonth() - 1); break;
    case "quarterly": periodStart = new Date(now); periodStart.setMonth(now.getMonth() - 3); break;
    case "yearly": periodStart = new Date(now); periodStart.setFullYear(now.getFullYear() - 1); break;
  }

  const metrics = await gatherMetrics(userId, periodStart, now);
  const narrative = await generateNarrative(metrics, type);

  const { data, error } = await supabase.from("long_snapshots").insert({
    user_id: userId,
    snapshot_type: type,
    period_start: periodStart.toISOString().split("T")[0],
    period_end: now.toISOString().split("T")[0],
    ...metrics,
    narrative_summary: narrative,
  }).select().single();

  if (error) throw error;
  return data;
}

async function gatherMetrics(userId: string, start: Date, end: Date): Promise<Record<string, any>> {
  const supabase = getSupabase();
  const { data: emotions } = await supabase.from("emo_states").select("detected_emotion, intensity, valence").eq("user_id", userId).gte("occurred_at", start.toISOString()).lte("occurred_at", end.toISOString());
  const { data: tasks } = await supabase.from("tasks").select("status").eq("user_id", userId).gte("created_at", start.toISOString()).lte("created_at", end.toISOString());

  const emotionCount: Record<string, number> = {};
  let totalValence = 0, valenceCount = 0;

  for (const e of emotions || []) {
    emotionCount[e.detected_emotion] = (emotionCount[e.detected_emotion] || 0) + 1;
    if (e.valence !== null) { totalValence += e.valence; valenceCount++; }
  }

  const dominantEmotions = Object.entries(emotionCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
  const tasksCompleted = (tasks || []).filter((t) => t.status === "completed").length;

  return {
    avg_emotional_valence: valenceCount > 0 ? totalValence / valenceCount : null,
    dominant_emotions: dominantEmotions,
    tasks_completed: tasksCompleted,
    metrics_data: { emotion_count: emotionCount, total_tasks: (tasks || []).length },
  };
}

async function generateNarrative(metrics: Record<string, any>, type: string): Promise<string> {
  const prompt = "Based on these " + type + " metrics, write a brief (2-3 sentences) narrative summary:\n\nDominant emotions: " + (metrics.dominant_emotions?.join(", ") || "none") + "\nTasks completed: " + metrics.tasks_completed + "\n\nWrite in second person. Be insightful but concise.";
  return LLM.completeSimple(prompt, { temperature: 0.7, max_tokens: 150 });
}

export async function getSnapshots(userId: string, type?: "weekly" | "monthly" | "quarterly" | "yearly"): Promise<Snapshot[]> {
  const supabase = getSupabase();
  let query = supabase.from("long_snapshots").select("*").eq("user_id", userId).order("period_start", { ascending: false });
  if (type) query = query.eq("snapshot_type", type);
  const { data } = await query.limit(50);
  return data || [];
}

export async function detectTrends(userId: string): Promise<Trend[]> {
  const supabase = getSupabase();
  const { data: snapshots } = await supabase.from("long_snapshots").select("*").eq("user_id", userId).order("period_start", { ascending: true }).limit(12);
  if (!snapshots || snapshots.length < 3) return [];
  return [];
}

export async function startChapter(userId: string, title: string, focus?: string, themes?: string[]): Promise<Chapter> {
  const supabase = getSupabase();
  await supabase.from("long_chapters").update({ status: "completed", end_date: new Date().toISOString().split("T")[0] }).eq("user_id", userId).eq("status", "active");
  const { data, error } = await supabase.from("long_chapters").insert({ user_id: userId, chapter_title: title, start_date: new Date().toISOString().split("T")[0], primary_focus: focus, themes: themes || [] }).select().single();
  if (error) throw error;
  return data;
}

export async function getCurrentChapter(userId: string): Promise<Chapter | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from("long_chapters").select("*").eq("user_id", userId).eq("status", "active").single();
  return data;
}

export async function recordMilestone(userId: string, milestone: { type: string; title: string; description?: string; date?: Date; significance?: number }): Promise<Milestone> {
  const supabase = getSupabase();
  const chapter = await getCurrentChapter(userId);
  const { data, error } = await supabase.from("long_milestones").insert({
    user_id: userId,
    milestone_type: milestone.type,
    title: milestone.title,
    description: milestone.description,
    occurred_at: (milestone.date || new Date()).toISOString().split("T")[0],
    significance_score: milestone.significance || 0.5,
    chapter_id: chapter?.id,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTrajectory(userId: string, attribute: string, level: number, note?: string): Promise<Trajectory> {
  const supabase = getSupabase();
  const { data: existing } = await supabase.from("long_trajectories").select("*").eq("user_id", userId).eq("attribute_name", attribute).single();
  const newPoint = { date: new Date().toISOString().split("T")[0], level, note };

  if (existing) {
    const history = [...(existing.history || []), newPoint];
    const { data, error } = await supabase.from("long_trajectories").update({ current_level: level, history, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from("long_trajectories").insert({ user_id: userId, attribute_name: attribute, current_level: level, history: [newPoint] }).select().single();
  if (error) throw error;
  return data;
}

export const LongitudinalModeling = { createSnapshot, getSnapshots, detectTrends, startChapter, getCurrentChapter, recordMilestone, updateTrajectory };
export default LongitudinalModeling;
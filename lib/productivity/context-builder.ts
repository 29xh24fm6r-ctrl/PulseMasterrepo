// Third Brain Context Builder for Productivity
// lib/productivity/context-builder.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";

export interface ProjectContext {
  id: string;
  name: string;
  description?: string;
  recentNotes: string[];
  lastActivityAt: string;
  relatedTasks: number;
}

export interface PatternInsight {
  type: "decision" | "timing" | "energy" | "context";
  description: string;
  confidence: number;
  source: string;
}

export interface CognitiveProfile {
  peakHours: number[];
  preferredTaskLength: number;
  contextSwitchingCost: number;
  deepWorkCapacity: number;
  currentEnergyLevel: number;
}

export interface ThirdBrainContext {
  activeProjects: ProjectContext[];
  recentNotes: string[];
  decisionPatterns: PatternInsight[];
  cognitiveProfile: CognitiveProfile;
  motivationalDrivers: string[];
  emotionalTrend: {
    primary: string;
    intensity: number;
    trend: "improving" | "stable" | "declining";
  };
  recentCompletedTasks: Array<{
    id: string;
    title: string;
    completedAt: string;
    duration?: number;
  }>;
  constraints: string[];
}

/**
 * Build comprehensive Third Brain context for productivity planning
 */
export async function buildThirdBrainProductivityContext(
  userId: string
): Promise<ThirdBrainContext> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // 1. Load active projects
  const activeProjects = await loadActiveProjects(dbUserId);

  // 2. Load recent notes (last 72 hours)
  const recentNotes = await loadRecentNotes(dbUserId);

  // 3. Load decision patterns from Third Brain insights
  const decisionPatterns = await loadDecisionPatterns(dbUserId);

  // 4. Build cognitive profile
  const cognitiveProfile = await buildCognitiveProfile(dbUserId);

  // 5. Load motivational drivers
  const motivationalDrivers = await loadMotivationalDrivers(dbUserId);

  // 6. Get emotional trend
  const emotionalTrend = await getEmotionalTrend(userId);

  // 7. Load recent completed tasks (last 72 hours)
  const recentCompletedTasks = await loadRecentCompletedTasks(dbUserId);

  // 8. Load self-reported constraints
  const constraints = await loadConstraints(dbUserId);

  return {
    activeProjects,
    recentNotes,
    decisionPatterns,
    cognitiveProfile,
    motivationalDrivers,
    emotionalTrend,
    recentCompletedTasks,
    constraints,
  };
}

async function loadActiveProjects(userId: string): Promise<ProjectContext[]> {
  try {
    // Load from projects table or third_brain_memories with category "project"
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, name, description, updated_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!projects) return [];

    const projectContexts: ProjectContext[] = [];

    for (const project of projects) {
      // Get recent notes for this project
      const { data: notes } = await supabaseAdmin
        .from("third_brain_memories")
        .select("content")
        .eq("user_id", userId)
        .eq("category", "note")
        .contains("metadata", { project_id: project.id })
        .order("last_updated_at", { ascending: false })
        .limit(5);

      // Count related tasks
      const { count } = await supabaseAdmin
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("project_id", project.id)
        .in("status", ["pending", "in_progress"]);

      projectContexts.push({
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        recentNotes: (notes || []).map((n) => n.content || "").filter(Boolean),
        lastActivityAt: project.updated_at,
        relatedTasks: count || 0,
      });
    }

    return projectContexts;
  } catch (err) {
    console.warn("[ContextBuilder] Failed to load projects:", err);
    return [];
  }
}

async function loadRecentNotes(userId: string): Promise<string[]> {
  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const { data: notes } = await supabaseAdmin
      .from("third_brain_memories")
      .select("content, summary")
      .eq("user_id", userId)
      .eq("category", "note")
      .gte("last_updated_at", seventyTwoHoursAgo)
      .order("last_updated_at", { ascending: false })
      .limit(20);

    return (notes || [])
      .map((n) => n.summary || n.content || "")
      .filter(Boolean)
      .slice(0, 10);
  } catch (err) {
    console.warn("[ContextBuilder] Failed to load notes:", err);
    return [];
  }
}

async function loadDecisionPatterns(userId: string): Promise<PatternInsight[]> {
  try {
    // Load from third_brain_insights
    const { data: insights } = await supabaseAdmin
      .from("third_brain_insights")
      .select("insight_type, content, confidence")
      .eq("user_id", userId)
      .in("insight_type", ["decision", "timing", "energy", "context"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (!insights) return [];

    return insights.map((insight) => ({
      type: insight.insight_type as PatternInsight["type"],
      description: insight.content || "",
      confidence: insight.confidence || 0.5,
      source: "third_brain_insights",
    }));
  } catch (err) {
    console.warn("[ContextBuilder] Failed to load decision patterns:", err);
    return [];
  }
}

async function buildCognitiveProfile(userId: string): Promise<CognitiveProfile> {
  try {
    // Analyze completed tasks to infer cognitive patterns
    const { data: completedTasks } = await supabaseAdmin
      .from("tasks")
      .select("completed_at, estimated_minutes")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(100);

    // Infer peak hours from completion times
    const hourCounts: Record<number, number> = {};
    let totalTaskLength = 0;
    let taskCount = 0;

    for (const task of completedTasks || []) {
      if (task.completed_at) {
        const hour = new Date(task.completed_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
      if (task.estimated_minutes) {
        totalTaskLength += task.estimated_minutes;
        taskCount++;
      }
    }

    // Find peak hours (top 3 hours with most completions)
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    const preferredTaskLength = taskCount > 0 ? Math.round(totalTaskLength / taskCount) : 30;

    // Estimate deep work capacity (tasks > 60 min per day)
    const { data: deepWorkTasks } = await supabaseAdmin
      .from("tasks")
      .select("estimated_minutes, completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gt("estimated_minutes", 60)
      .gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const deepWorkMinutes = (deepWorkTasks || []).reduce(
      (sum, t) => sum + (t.estimated_minutes || 0),
      0
    );
    const deepWorkCapacity = Math.round(deepWorkMinutes / 30); // Average per day over 30 days

    return {
      peakHours: peakHours.length > 0 ? peakHours : [9, 10, 11], // Default to morning
      preferredTaskLength,
      contextSwitchingCost: 0.3, // Default, could be learned from task switching patterns
      deepWorkCapacity: Math.max(60, deepWorkCapacity),
      currentEnergyLevel: 0.7, // Default, should be updated from emotion state
    };
  } catch (err) {
    console.warn("[ContextBuilder] Failed to build cognitive profile:", err);
    return {
      peakHours: [9, 10, 11],
      preferredTaskLength: 30,
      contextSwitchingCost: 0.3,
      deepWorkCapacity: 120,
      currentEnergyLevel: 0.7,
    };
  }
}

async function loadMotivationalDrivers(userId: string): Promise<string[]> {
  try {
    // Load from third_brain_memories with category "motivation" or "value"
    const { data: memories } = await supabaseAdmin
      .from("third_brain_memories")
      .select("content, key")
      .eq("user_id", userId)
      .in("category", ["motivation", "value", "goal"])
      .order("last_updated_at", { ascending: false })
      .limit(10);

    return (memories || [])
      .map((m) => m.content || m.key || "")
      .filter(Boolean)
      .slice(0, 5);
  } catch (err) {
    console.warn("[ContextBuilder] Failed to load motivational drivers:", err);
    return [];
  }
}

async function getEmotionalTrend(userId: string): Promise<{
  primary: string;
  intensity: number;
  trend: "improving" | "stable" | "declining";
}> {
  try {
    const current = await getCurrentEmotionState(userId);
    if (!current) {
      return { primary: "neutral", intensity: 0.5, trend: "stable" };
    }

    // Get recent emotion states to determine trend
    const { data: recent } = await supabaseAdmin
      .from("emo_states")
      .select("detected_emotion, intensity, occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(10);

    let trend: "improving" | "stable" | "declining" = "stable";
    if (recent && recent.length >= 3) {
      const avgRecent = recent.slice(0, 3).reduce((sum, e) => sum + (e.intensity || 0.5), 0) / 3;
      const avgOlder = recent.slice(3, 6).reduce((sum, e) => sum + (e.intensity || 0.5), 0) / 3;
      
      if (avgRecent > avgOlder + 0.1) trend = "improving";
      else if (avgRecent < avgOlder - 0.1) trend = "declining";
    }

    return {
      primary: current.detected_emotion,
      intensity: current.intensity || 0.5,
      trend,
    };
  } catch (err) {
    console.warn("[ContextBuilder] Failed to get emotional trend:", err);
    return { primary: "neutral", intensity: 0.5, trend: "stable" };
  }
}

async function loadRecentCompletedTasks(userId: string): Promise<Array<{
  id: string;
  title: string;
  completedAt: string;
  duration?: number;
}>> {
  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, title, completed_at, estimated_minutes")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", seventyTwoHoursAgo)
      .order("completed_at", { ascending: false })
      .limit(20);

    return (tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      completedAt: t.completed_at || "",
      duration: t.estimated_minutes || undefined,
    }));
  } catch (err) {
    console.warn("[ContextBuilder] Failed to load completed tasks:", err);
    return [];
  }
}

async function loadConstraints(userId: string): Promise<string[]> {
  try {
    // Load from user settings or third_brain_memories with category "constraint"
    const { data: memories } = await supabaseAdmin
      .from("third_brain_memories")
      .select("content")
      .eq("user_id", userId)
      .eq("category", "constraint")
      .order("last_updated_at", { ascending: false })
      .limit(5);

    return (memories || []).map((m) => m.content || "").filter(Boolean);
  } catch (err) {
    console.warn("[ContextBuilder] Failed to load constraints:", err);
    return [];
  }
}




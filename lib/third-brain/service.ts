/**
 * Third Brain Service v2
 * Unified memory + context layer for Pulse OS
 * 
 * This service provides:
 * - Event logging (all significant user actions/data)
 * - Memory management (persistent knowledge about relationships, projects, habits)
 * - Context snapshots (for AI prompts)
 * - AI-powered daily cycle with insight generation
 */

import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson, analyzeSentiment } from "@/lib/ai/call";

// ============================================
// TYPES
// ============================================

export interface ThirdBrainEvent {
  id: string;
  userId: string;
  type: string;
  source: string;
  title: string | null;
  summary: string | null;
  rawPayload: Record<string, any>;
  occurredAt: Date;
  createdAt: Date;
}

export interface ThirdBrainMemory {
  id: string;
  userId: string;
  category: string;
  key: string;
  importance: number;
  content: string;
  metadata: Record<string, any>;
  lastUpdatedAt: Date;
  createdAt: Date;
}

export interface ThirdBrainInsight {
  id: string;
  userId: string;
  kind: "risk" | "opportunity" | "suggestion" | "reflection" | "nudge";
  title: string;
  description: string;
  relatedKey: string | null;
  severity: number;
  status: "open" | "accepted" | "dismissed" | "done" | "snoozed";
  createdAt: Date;
  actedAt: Date | null;
}

export interface HabitStats {
  habitName: string;
  habitId: string;
  completions: number;
  daysMissed: number;
  completionRate: number;
}

export interface RelationshipStats {
  key: string;
  name: string;
  lastCallAt: Date | null;
  callsLast30Days: number;
  trend: "warming" | "stable" | "cooling" | "gone_quiet";
}

export interface ContextSnapshot {
  userId: string;
  generatedAt: Date;
  recentEvents: Array<{
    id: string;
    type: string;
    source: string;
    title: string | null;
    summary: string | null;
    occurredAt: Date;
  }>;
  recentMemories: Array<{
    id: string;
    category: string;
    key: string;
    importance: number;
    content: string;
  }>;
  activeInsights: Array<{
    id: string;
    kind: string;
    title: string;
    severity: number;
  }>;
  metrics: {
    tasksCompletedLast7Days: number;
    callsLast7Days: number;
    emailsLast7Days: number;
    xpGainedLast7Days: number;
    journalEntriesLast7Days: number;
    dealsAdvancedLast7Days: number;
  };
  // V2 additions
  habitStats?: {
    habits: HabitStats[];
    strongest: HabitStats | null;
    weakest: HabitStats | null;
  };
  journalSummary?: {
    count: number;
    sentiment: "very_negative" | "negative" | "neutral" | "positive" | "very_positive";
    themes: string[];
  };
  relationshipStats?: {
    relationships: RelationshipStats[];
    goneQuiet: RelationshipStats[];
    warming: RelationshipStats[];
  };
  questSummary?: {
    completedLast7Days: number;
    totalXpEarned: number;
  };
}

export interface LogEventInput {
  userId: string;
  type: string;
  source: string;
  title?: string;
  summary?: string;
  rawPayload?: Record<string, any>;
  occurredAt?: Date;
}

export interface UpsertMemoryInput {
  userId: string;
  category: string;
  key: string;
  content: string;
  importance?: number;
  metadata?: Record<string, any>;
}

export interface CreateInsightInput {
  userId: string;
  kind: "risk" | "opportunity" | "suggestion" | "reflection" | "nudge";
  title: string;
  description: string;
  relatedKey?: string;
  severity?: number;
  expiresAt?: Date;
}

// ============================================
// EVENT LOGGING
// ============================================

/**
 * Log a significant event to Third Brain
 * Call this from any system that generates meaningful data
 */
export async function logThirdBrainEvent(input: LogEventInput): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("third_brain_events")
      .insert({
        user_id: input.userId,
        type: input.type,
        source: input.source,
        title: input.title || null,
        summary: input.summary || null,
        raw_payload: input.rawPayload || {},
        occurred_at: input.occurredAt?.toISOString() || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ThirdBrain] Error logging event:", error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error("[ThirdBrain] Exception logging event:", err);
    return null;
  }
}

/**
 * Batch log multiple events
 */
export async function logThirdBrainEventsBatch(
  events: LogEventInput[]
): Promise<number> {
  if (events.length === 0) return 0;

  try {
    const { data, error } = await supabaseAdmin
      .from("third_brain_events")
      .insert(
        events.map((e) => ({
          user_id: e.userId,
          type: e.type,
          source: e.source,
          title: e.title || null,
          summary: e.summary || null,
          raw_payload: e.rawPayload || {},
          occurred_at: e.occurredAt?.toISOString() || new Date().toISOString(),
        }))
      )
      .select("id");

    if (error) {
      console.error("[ThirdBrain] Error batch logging events:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    console.error("[ThirdBrain] Exception batch logging events:", err);
    return 0;
  }
}

// ============================================
// MEMORY MANAGEMENT
// ============================================

/**
 * Upsert a memory (create or update by key)
 * Use stable keys like 'relationship:john_smith', 'deal:acme_corp', 'habit:morning_routine'
 */
export async function upsertMemory(input: UpsertMemoryInput): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("third_brain_memories")
      .upsert(
        {
          user_id: input.userId,
          category: input.category,
          key: input.key,
          content: input.content,
          importance: input.importance || 1,
          metadata: input.metadata || {},
          last_updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,key",
        }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[ThirdBrain] Error upserting memory:", error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error("[ThirdBrain] Exception upserting memory:", err);
    return null;
  }
}

/**
 * Get a specific memory by key
 */
export async function getMemory(
  userId: string,
  key: string
): Promise<ThirdBrainMemory | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("third_brain_memories")
      .select("*")
      .eq("user_id", userId)
      .eq("key", key)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      key: data.key,
      importance: data.importance,
      content: data.content,
      metadata: data.metadata,
      lastUpdatedAt: new Date(data.last_updated_at),
      createdAt: new Date(data.created_at),
    };
  } catch (err) {
    console.error("[ThirdBrain] Exception getting memory:", err);
    return null;
  }
}

/**
 * Get memories by category
 */
export async function getMemoriesByCategory(
  userId: string,
  category: string,
  limit: number = 50
): Promise<ThirdBrainMemory[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("third_brain_memories")
      .select("*")
      .eq("user_id", userId)
      .eq("category", category)
      .order("importance", { ascending: false })
      .order("last_updated_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      category: d.category,
      key: d.key,
      importance: d.importance,
      content: d.content,
      metadata: d.metadata,
      lastUpdatedAt: new Date(d.last_updated_at),
      createdAt: new Date(d.created_at),
    }));
  } catch (err) {
    console.error("[ThirdBrain] Exception getting memories by category:", err);
    return [];
  }
}

/**
 * Get top memories by importance
 */
export async function getTopMemories(
  userId: string,
  limit: number = 20
): Promise<ThirdBrainMemory[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("third_brain_memories")
      .select("*")
      .eq("user_id", userId)
      .order("importance", { ascending: false })
      .order("last_updated_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      category: d.category,
      key: d.key,
      importance: d.importance,
      content: d.content,
      metadata: d.metadata,
      lastUpdatedAt: new Date(d.last_updated_at),
      createdAt: new Date(d.created_at),
    }));
  } catch (err) {
    console.error("[ThirdBrain] Exception getting top memories:", err);
    return [];
  }
}

/**
 * Delete a memory by key
 */
export async function deleteMemory(userId: string, key: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("third_brain_memories")
      .delete()
      .eq("user_id", userId)
      .eq("key", key);

    return !error;
  } catch (err) {
    console.error("[ThirdBrain] Exception deleting memory:", err);
    return false;
  }
}

// ============================================
// INSIGHTS
// ============================================

/**
 * Create a new insight
 */
export async function createInsight(input: CreateInsightInput): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("third_brain_insights")
      .insert({
        user_id: input.userId,
        kind: input.kind,
        title: input.title,
        description: input.description,
        related_key: input.relatedKey || null,
        severity: input.severity || 1,
        status: "open",
        expires_at: input.expiresAt?.toISOString() || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ThirdBrain] Error creating insight:", error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error("[ThirdBrain] Exception creating insight:", err);
    return null;
  }
}

/**
 * Get open insights for a user
 */
export async function getOpenInsights(
  userId: string,
  limit: number = 20
): Promise<ThirdBrainInsight[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("third_brain_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      kind: d.kind,
      title: d.title,
      description: d.description,
      relatedKey: d.related_key,
      severity: d.severity,
      status: d.status,
      createdAt: new Date(d.created_at),
      actedAt: d.acted_at ? new Date(d.acted_at) : null,
    }));
  } catch (err) {
    console.error("[ThirdBrain] Exception getting open insights:", err);
    return [];
  }
}

/**
 * Update insight status
 */
export async function updateInsightStatus(
  insightId: string,
  status: "accepted" | "dismissed" | "done" | "snoozed"
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("third_brain_insights")
      .update({
        status,
        acted_at: new Date().toISOString(),
      })
      .eq("id", insightId);

    return !error;
  } catch (err) {
    console.error("[ThirdBrain] Exception updating insight status:", err);
    return false;
  }
}

/**
 * Check if a similar insight already exists (for deduplication)
 */
async function insightExistsRecently(
  userId: string,
  kind: string,
  title: string,
  daysBack: number = 3
): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data } = await supabaseAdmin
    .from("third_brain_insights")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("title", title)
    .eq("status", "open")
    .gte("created_at", since.toISOString())
    .limit(1);

  return (data?.length || 0) > 0;
}

// ============================================
// CONTEXT SNAPSHOT
// ============================================

/**
 * Build a context snapshot for AI prompts
 * This aggregates recent events, top memories, and metrics
 */
export async function buildContextSnapshot(userId: string): Promise<ContextSnapshot> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // Fetch recent events (last 7 days, max 50)
  const { data: recentEventsData } = await supabaseAdmin
    .from("third_brain_events")
    .select("id, type, source, title, summary, occurred_at")
    .eq("user_id", userId)
    .gte("occurred_at", sevenDaysAgoISO)
    .order("occurred_at", { ascending: false })
    .limit(50);

  // Fetch top memories
  const { data: memoriesData } = await supabaseAdmin
    .from("third_brain_memories")
    .select("id, category, key, importance, content")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("last_updated_at", { ascending: false })
    .limit(30);

  // Fetch open insights
  const { data: insightsData } = await supabaseAdmin
    .from("third_brain_insights")
    .select("id, kind, title, severity")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("severity", { ascending: false })
    .limit(10);

  // Calculate metrics from events
  const events = recentEventsData || [];
  const metrics = {
    tasksCompletedLast7Days: events.filter((e) => e.type === "task_completed").length,
    callsLast7Days: events.filter((e) => e.type === "call").length,
    emailsLast7Days: events.filter((e) => e.type === "email").length,
    xpGainedLast7Days: events
      .filter((e) => e.type === "xp_gain")
      .reduce((sum, e) => sum + 1, 0),
    journalEntriesLast7Days: events.filter((e) => e.type === "journal").length,
    dealsAdvancedLast7Days: events.filter(
      (e) => e.type === "deal_advanced" || e.type === "deal_won"
    ).length,
  };

  return {
    userId,
    generatedAt: new Date(),
    recentEvents: (recentEventsData || []).map((e) => ({
      id: e.id,
      type: e.type,
      source: e.source,
      title: e.title,
      summary: e.summary,
      occurredAt: new Date(e.occurred_at),
    })),
    recentMemories: (memoriesData || []).map((m) => ({
      id: m.id,
      category: m.category,
      key: m.key,
      importance: m.importance,
      content: m.content,
    })),
    activeInsights: (insightsData || []).map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      severity: i.severity,
    })),
    metrics,
  };
}

/**
 * Build a compact context string for AI prompts
 */
export async function buildContextString(
  userId: string,
  options: {
    includeEvents?: boolean;
    includeMemories?: boolean;
    includeInsights?: boolean;
    includeMetrics?: boolean;
    maxLength?: number;
  } = {}
): Promise<string> {
  const {
    includeEvents = true,
    includeMemories = true,
    includeInsights = true,
    includeMetrics = true,
    maxLength = 4000,
  } = options;

  const snapshot = await buildContextSnapshot(userId);
  const parts: string[] = [];

  if (includeMetrics) {
    parts.push(
      `## Recent Activity (7 days)\n` +
        `- Tasks completed: ${snapshot.metrics.tasksCompletedLast7Days}\n` +
        `- Calls: ${snapshot.metrics.callsLast7Days}\n` +
        `- Emails: ${snapshot.metrics.emailsLast7Days}\n` +
        `- Journal entries: ${snapshot.metrics.journalEntriesLast7Days}\n` +
        `- Deals advanced: ${snapshot.metrics.dealsAdvancedLast7Days}`
    );
  }

  if (includeMemories && snapshot.recentMemories.length > 0) {
    const memoryLines = snapshot.recentMemories
      .slice(0, 15)
      .map((m) => `- [${m.category}] ${m.key}: ${m.content.substring(0, 100)}...`);
    parts.push(`## Key Memories\n${memoryLines.join("\n")}`);
  }

  if (includeInsights && snapshot.activeInsights.length > 0) {
    const insightLines = snapshot.activeInsights.map(
      (i) => `- [${i.kind.toUpperCase()}] ${i.title}`
    );
    parts.push(`## Active Insights\n${insightLines.join("\n")}`);
  }

  if (includeEvents && snapshot.recentEvents.length > 0) {
    const eventLines = snapshot.recentEvents.slice(0, 10).map((e) => {
      const date = e.occurredAt.toLocaleDateString();
      return `- ${date}: [${e.type}] ${e.title || e.summary || "(no title)"}`;
    });
    parts.push(`## Recent Events\n${eventLines.join("\n")}`);
  }

  let result = parts.join("\n\n");

  if (result.length > maxLength) {
    result = result.substring(0, maxLength - 3) + "...";
  }

  return result;
}

// ============================================
// DAILY CYCLE - V2 WITH AI INSIGHTS
// ============================================

/**
 * Compute habit stats from events
 */
async function computeHabitStats(
  userId: string,
  events: any[]
): Promise<ContextSnapshot["habitStats"]> {
  const habitEvents = events.filter((e) => e.type === "habit_completed");

  // Group by habit
  const habitMap = new Map<string, { name: string; id: string; completions: number }>();

  for (const event of habitEvents) {
    const habitId = event.raw_payload?.habitId || "unknown";
    const habitName = event.raw_payload?.habitName || event.title?.replace("Habit: ", "") || "Unknown";

    if (!habitMap.has(habitId)) {
      habitMap.set(habitId, { name: habitName, id: habitId, completions: 0 });
    }
    habitMap.get(habitId)!.completions++;
  }

  const habits: HabitStats[] = Array.from(habitMap.values()).map((h) => ({
    habitName: h.name,
    habitId: h.id,
    completions: h.completions,
    daysMissed: 7 - h.completions, // Simplified: assuming daily habits
    completionRate: h.completions / 7,
  }));

  // Sort by completion rate
  habits.sort((a, b) => b.completionRate - a.completionRate);

  return {
    habits,
    strongest: habits.length > 0 ? habits[0] : null,
    weakest: habits.length > 0 ? habits[habits.length - 1] : null,
  };
}

/**
 * Compute journal summary with sentiment analysis
 */
async function computeJournalSummary(
  userId: string,
  events: any[]
): Promise<ContextSnapshot["journalSummary"]> {
  const journalEvents = events.filter((e) => e.type === "journal");

  if (journalEvents.length === 0) {
    return {
      count: 0,
      sentiment: "neutral",
      themes: [],
    };
  }

  // Extract journal content for sentiment analysis
  const journalTexts = journalEvents
    .slice(0, 10)
    .map((e) => e.summary || e.title || "")
    .filter((t) => t.length > 0);

  // Call AI for sentiment analysis
  const sentimentResult = await analyzeSentiment(userId, journalTexts);

  return {
    count: journalEvents.length,
    sentiment: sentimentResult?.overall || "neutral",
    themes: sentimentResult?.themes || [],
  };
}

/**
 * Compute relationship stats from memories and events
 */
async function computeRelationshipStats(
  userId: string,
  events: any[]
): Promise<ContextSnapshot["relationshipStats"]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get relationship memories
  const relationshipMemories = await getMemoriesByCategory(userId, "relationship", 50);

  // Count calls per relationship in last 30 days
  const callEvents = events.filter((e) => e.type === "call");

  const relationships: RelationshipStats[] = relationshipMemories.map((mem) => {
    const contactName = mem.key.replace("relationship:", "").replace(/_/g, " ");
    const lastCallAt = mem.metadata?.lastCallDate
      ? new Date(mem.metadata.lastCallDate)
      : null;

    // Count calls to this contact
    const callsLast30Days = callEvents.filter((e) => {
      const eventContactName = e.raw_payload?.contactName?.toLowerCase().replace(/\s+/g, "_");
      return eventContactName === mem.key.replace("relationship:", "");
    }).length;

    // Determine trend
    let trend: RelationshipStats["trend"] = "stable";
    if (!lastCallAt || lastCallAt < thirtyDaysAgo) {
      trend = "gone_quiet";
    } else if (callsLast30Days >= 3) {
      trend = "warming";
    } else if (callsLast30Days === 0 && lastCallAt) {
      trend = "cooling";
    }

    return {
      key: mem.key,
      name: contactName,
      lastCallAt,
      callsLast30Days,
      trend,
    };
  });

  return {
    relationships,
    goneQuiet: relationships.filter((r) => r.trend === "gone_quiet"),
    warming: relationships.filter((r) => r.trend === "warming"),
  };
}

/**
 * Compute quest summary
 */
function computeQuestSummary(events: any[]): ContextSnapshot["questSummary"] {
  const questEvents = events.filter((e) => e.type === "quest_completed");

  const totalXpEarned = questEvents.reduce((sum, e) => {
    return sum + (e.raw_payload?.xpAwarded || 0);
  }, 0);

  return {
    completedLast7Days: questEvents.length,
    totalXpEarned,
  };
}

/**
 * Generate AI-powered insights from the context snapshot
 */
async function generateInsightsFromSnapshot(
  userId: string,
  snapshot: ContextSnapshot
): Promise<Array<{
  kind: "risk" | "opportunity" | "suggestion" | "reflection";
  title: string;
  description: string;
  related_key?: string;
  severity: number;
}>> {
  // Build a summary for the AI
  const summaryParts: string[] = [];

  // Habit stats
  if (snapshot.habitStats) {
    const { habits, strongest, weakest } = snapshot.habitStats;
    summaryParts.push(`HABITS (last 7 days):`);
    if (habits.length === 0) {
      summaryParts.push(`- No habit data tracked yet`);
    } else {
      summaryParts.push(`- ${habits.length} habits tracked`);
      if (strongest) {
        summaryParts.push(
          `- Strongest: "${strongest.habitName}" (${Math.round(strongest.completionRate * 100)}% completion)`
        );
      }
      if (weakest && weakest !== strongest) {
        summaryParts.push(
          `- Weakest: "${weakest.habitName}" (${Math.round(weakest.completionRate * 100)}% completion, ${weakest.daysMissed} days missed)`
        );
      }
    }
  }

  // Journal summary
  if (snapshot.journalSummary) {
    const { count, sentiment, themes } = snapshot.journalSummary;
    summaryParts.push(`\nJOURNAL (last 7 days):`);
    summaryParts.push(`- ${count} journal entries`);
    summaryParts.push(`- Overall sentiment: ${sentiment}`);
    if (themes.length > 0) {
      summaryParts.push(`- Recurring themes: ${themes.join(", ")}`);
    }
  }

  // Relationship stats
  if (snapshot.relationshipStats) {
    const { relationships, goneQuiet, warming } = snapshot.relationshipStats;
    summaryParts.push(`\nRELATIONSHIPS:`);
    summaryParts.push(`- ${relationships.length} relationships tracked`);
    if (goneQuiet.length > 0) {
      const names = goneQuiet.slice(0, 3).map((r) => r.name).join(", ");
      summaryParts.push(`- Gone quiet (30+ days): ${names}`);
    }
    if (warming.length > 0) {
      const names = warming.slice(0, 3).map((r) => r.name).join(", ");
      summaryParts.push(`- Warming (frequent contact): ${names}`);
    }
  }

  // Quest summary
  if (snapshot.questSummary) {
    const { completedLast7Days, totalXpEarned } = snapshot.questSummary;
    summaryParts.push(`\nQUESTS (last 7 days):`);
    summaryParts.push(`- ${completedLast7Days} quests completed`);
    summaryParts.push(`- ${totalXpEarned} XP earned`);
  }

  // General metrics
  summaryParts.push(`\nOTHER ACTIVITY:`);
  summaryParts.push(`- Calls: ${snapshot.metrics.callsLast7Days}`);
  summaryParts.push(`- Tasks completed: ${snapshot.metrics.tasksCompletedLast7Days}`);
  summaryParts.push(`- Deals advanced: ${snapshot.metrics.dealsAdvancedLast7Days}`);

  const snapshotText = summaryParts.join("\n");

  // Call AI to generate insights
  const result = await callAIJson<
    Array<{
      kind: "risk" | "opportunity" | "suggestion" | "reflection";
      title: string;
      description: string;
      related_key?: string;
    }>
  >({
    userId,
    feature: "third_brain_insights",
    systemPrompt: `You are the Pulse Third Brain, an AI that analyzes a user's recent activity and generates actionable insights.

Your insights should be:
- Specific and actionable (not generic advice)
- Based on patterns in the data
- Empathetic but honest
- Focused on helping the user improve

Output ONLY a JSON array with 3-7 insights.`,
    userPrompt: `Given this snapshot of the user's recent activity:

${snapshotText}

Generate 3-7 concise insights classified as:
- "risk": something slipping, dangerous, or a negative trend
- "opportunity": something promising they could lean into
- "suggestion": a simple, concrete next step
- "reflection": a perspective or pattern they should be aware of

Output as a strict JSON array:
[
  {
    "kind": "risk" | "opportunity" | "suggestion" | "reflection",
    "title": "Short title (max 50 chars)",
    "description": "1-2 sentence explanation",
    "related_key": "optional key like 'relationship:john' or 'habit:morning_routine'"
  }
]

Only output valid JSON array, no other text.`,
    maxTokens: 1000,
    temperature: 0.4,
  });

  if (!result.success || !result.data || !Array.isArray(result.data)) {
    console.error("[ThirdBrain] Failed to generate insights:", result.error);
    return [];
  }

  // Add severity based on kind and context
  return result.data.map((insight) => {
    let severity = 2;

    // Higher severity for risks
    if (insight.kind === "risk") {
      severity = 3;
      // Even higher if sentiment is negative
      if (snapshot.journalSummary?.sentiment === "very_negative") {
        severity = 5;
      } else if (snapshot.journalSummary?.sentiment === "negative") {
        severity = 4;
      }
    } else if (insight.kind === "opportunity") {
      severity = 2;
    } else if (insight.kind === "suggestion") {
      severity = 2;
    } else if (insight.kind === "reflection") {
      severity = 1;
    }

    return {
      ...insight,
      severity,
    };
  });
}

/**
 * Run the daily Third Brain cycle v2
 * This should be called by a cron job once per day
 * 
 * What it does:
 * 1. Compute habit stats
 * 2. Analyze journal sentiment + themes
 * 3. Compute relationship stats
 * 4. Compute quest summary
 * 5. Generate AI insights
 * 6. Save insights (with deduplication)
 */
export async function runThirdBrainDailyCycle(userId: string): Promise<{
  eventsProcessed: number;
  memoriesUpdated: number;
  insightsGenerated: number;
  habitStats: ContextSnapshot["habitStats"] | null;
  journalSummary: ContextSnapshot["journalSummary"] | null;
  relationshipStats: ContextSnapshot["relationshipStats"] | null;
  questSummary: ContextSnapshot["questSummary"] | null;
}> {
  const result = {
    eventsProcessed: 0,
    memoriesUpdated: 0,
    insightsGenerated: 0,
    habitStats: null as ContextSnapshot["habitStats"] | null,
    journalSummary: null as ContextSnapshot["journalSummary"] | null,
    relationshipStats: null as ContextSnapshot["relationshipStats"] | null,
    questSummary: null as ContextSnapshot["questSummary"] | null,
  };

  try {
    console.log(`[ThirdBrain] Starting daily cycle for ${userId}`);

    // 1. Get recent events (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentEvents } = await supabaseAdmin
      .from("third_brain_events")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", sevenDaysAgo.toISOString())
      .order("occurred_at", { ascending: false });

    result.eventsProcessed = recentEvents?.length || 0;

    if (!recentEvents || recentEvents.length === 0) {
      console.log(`[ThirdBrain] No events for ${userId}, skipping cycle`);
      return result;
    }

    // 2. Compute all stats
    result.habitStats = await computeHabitStats(userId, recentEvents);
    result.journalSummary = await computeJournalSummary(userId, recentEvents);
    result.relationshipStats = await computeRelationshipStats(userId, recentEvents);
    result.questSummary = computeQuestSummary(recentEvents);

    // 3. Build enhanced snapshot
    const baseSnapshot = await buildContextSnapshot(userId);
    const enhancedSnapshot: ContextSnapshot = {
      ...baseSnapshot,
      habitStats: result.habitStats,
      journalSummary: result.journalSummary,
      relationshipStats: result.relationshipStats,
      questSummary: result.questSummary,
    };

    // 4. Generate AI insights
    const insights = await generateInsightsFromSnapshot(userId, enhancedSnapshot);

    // 5. Save insights with deduplication
    for (const insight of insights) {
      // Check for duplicate
      const exists = await insightExistsRecently(userId, insight.kind, insight.title, 3);
      if (exists) {
        console.log(`[ThirdBrain] Skipping duplicate insight: ${insight.title}`);
        continue;
      }

      await createInsight({
        userId,
        kind: insight.kind,
        title: insight.title,
        description: insight.description,
        relatedKey: insight.related_key,
        severity: insight.severity,
      });
      result.insightsGenerated++;
    }

    // 6. Update relationship memories based on stats
    if (result.relationshipStats?.goneQuiet) {
      for (const rel of result.relationshipStats.goneQuiet) {
        await upsertMemory({
          userId,
          category: "relationship",
          key: rel.key,
          content: `${rel.name} - Gone quiet. Last contact: ${
            rel.lastCallAt?.toLocaleDateString() || "Unknown"
          }. Consider reaching out.`,
          importance: 3,
          metadata: {
            trend: "gone_quiet",
            lastCallAt: rel.lastCallAt?.toISOString(),
            callsLast30Days: rel.callsLast30Days,
          },
        });
        result.memoriesUpdated++;
      }
    }

    // 7. Expire old insights
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await supabaseAdmin
      .from("third_brain_insights")
      .update({ status: "dismissed" })
      .eq("user_id", userId)
      .eq("status", "open")
      .lt("created_at", thirtyDaysAgo.toISOString());

    console.log(`[ThirdBrain] Daily cycle complete for ${userId}:`, result);
    return result;
  } catch (err) {
    console.error("[ThirdBrain] Exception in daily cycle:", err);
    return result;
  }
}

// ============================================
// CONVENIENCE HELPERS
// ============================================

/**
 * Quick helper to log a call event
 */
export async function logCallEvent(
  userId: string,
  contactName: string,
  summary: string,
  durationSeconds?: number
): Promise<string | null> {
  return logThirdBrainEvent({
    userId,
    type: "call",
    source: "telephony",
    title: `Call with ${contactName}`,
    summary,
    rawPayload: { contactName, durationSeconds },
  });
}

/**
 * Quick helper to log an email event
 */
export async function logEmailEvent(
  userId: string,
  subject: string,
  fromOrTo: string,
  direction: "sent" | "received"
): Promise<string | null> {
  return logThirdBrainEvent({
    userId,
    type: "email",
    source: "gmail",
    title: subject,
    summary: `${direction === "sent" ? "Sent to" : "Received from"} ${fromOrTo}`,
    rawPayload: { subject, contact: fromOrTo, direction },
  });
}

/**
 * Quick helper to log a task completion
 */
export async function logTaskCompleted(
  userId: string,
  taskTitle: string,
  xpAwarded?: number
): Promise<string | null> {
  return logThirdBrainEvent({
    userId,
    type: "task_completed",
    source: "notion",
    title: taskTitle,
    summary: xpAwarded ? `+${xpAwarded} XP` : undefined,
    rawPayload: { xpAwarded },
  });
}

/**
 * Quick helper to log a journal entry
 */
export async function logJournalEntry(
  userId: string,
  title: string,
  mood?: string
): Promise<string | null> {
  return logThirdBrainEvent({
    userId,
    type: "journal",
    source: "manual",
    title,
    rawPayload: { mood },
  });
}

/**
 * Quick helper to log deal progress
 */
export async function logDealEvent(
  userId: string,
  dealName: string,
  stage: string,
  value?: number
): Promise<string | null> {
  const isWon = stage.toLowerCase().includes("won") || stage.toLowerCase().includes("closed");
  
  return logThirdBrainEvent({
    userId,
    type: isWon ? "deal_won" : "deal_advanced",
    source: "notion",
    title: `${dealName} → ${stage}`,
    summary: value ? `$${value.toLocaleString()}` : undefined,
    rawPayload: { dealName, stage, value },
  });
}
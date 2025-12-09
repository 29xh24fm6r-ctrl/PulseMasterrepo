/**
 * Executive Engine v1
 * lib/executive/engine.ts
 * 
 * Computes life domain KPIs, trends, and generates executive summaries
 */

import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson } from "@/lib/ai/call";

// ============================================
// TYPES
// ============================================

export interface DomainKPIInput {
  userId: string;
  startDate: Date;
  endDate: Date;
}

export interface DomainKPI {
  domainKey: string;
  score: number;
  metrics: Record<string, any>;
}

export interface ExecutiveSummary {
  id: string;
  userId: string;
  periodType: "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  overallScore: number;
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  domainScores: Record<string, number>;
}

interface AIExecutiveSummary {
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

// ============================================
// DOMAIN SETUP
// ============================================

const DEFAULT_DOMAINS = [
  { key: "work", label: "Work & Career", weight: 3 },
  { key: "health", label: "Health & Fitness", weight: 3 },
  { key: "relationships", label: "Relationships", weight: 3 },
  { key: "finance", label: "Finance", weight: 2 },
  { key: "growth", label: "Personal Growth", weight: 2 },
  { key: "recovery", label: "Rest & Recovery", weight: 2 },
];

/**
 * Ensure user has default domains set up
 */
export async function ensureUserDomains(userId: string): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from("life_domains")
    .select("key")
    .eq("user_id", userId);

  if (existing && existing.length >= DEFAULT_DOMAINS.length) return;

  const existingKeys = new Set(existing?.map((d) => d.key) || []);

  const toInsert = DEFAULT_DOMAINS.filter((d) => !existingKeys.has(d.key)).map(
    (d) => ({
      user_id: userId,
      key: d.key,
      label: d.label,
      weight: d.weight,
    })
  );

  if (toInsert.length > 0) {
    await supabaseAdmin.from("life_domains").insert(toInsert);
  }
}

/**
 * Get user's domain configuration
 */
export async function getUserDomains(
  userId: string
): Promise<Array<{ key: string; label: string; weight: number }>> {
  await ensureUserDomains(userId);

  const { data } = await supabaseAdmin
    .from("life_domains")
    .select("key, label, weight")
    .eq("user_id", userId)
    .order("weight", { ascending: false });

  return data || [];
}

// ============================================
// KPI COMPUTATION
// ============================================

/**
 * Recompute domain KPIs for a period
 */
export async function recomputeDomainKPIs(input: DomainKPIInput): Promise<void> {
  const { userId, startDate, endDate } = input;
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  await ensureUserDomains(userId);

  // Gather all metrics
  const [habitMetrics, journalMetrics, relationshipMetrics, taskMetrics, xpMetrics] =
    await Promise.all([
      computeHabitMetrics(userId, startDate, endDate),
      computeJournalMetrics(userId, startDate, endDate),
      computeRelationshipMetrics(userId, startDate, endDate),
      computeTaskMetrics(userId, startDate, endDate),
      computeXPMetrics(userId, startDate, endDate),
    ]);

  // Compute domain scores
  const domainKPIs: DomainKPI[] = [
    {
      domainKey: "work",
      score: computeWorkScore(taskMetrics, xpMetrics),
      metrics: { tasks: taskMetrics, xp: xpMetrics },
    },
    {
      domainKey: "health",
      score: computeHealthScore(habitMetrics),
      metrics: { habits: habitMetrics },
    },
    {
      domainKey: "relationships",
      score: computeRelationshipScore(relationshipMetrics),
      metrics: { relationships: relationshipMetrics },
    },
    {
      domainKey: "finance",
      score: 70, // Placeholder - would integrate with deals/finance data
      metrics: {},
    },
    {
      domainKey: "growth",
      score: computeGrowthScore(journalMetrics, xpMetrics),
      metrics: { journal: journalMetrics, xp: xpMetrics },
    },
    {
      domainKey: "recovery",
      score: computeRecoveryScore(habitMetrics, journalMetrics),
      metrics: { habits: habitMetrics, journal: journalMetrics },
    },
  ];

  // Upsert KPIs
  for (const kpi of domainKPIs) {
    await supabaseAdmin.from("domain_kpis").upsert(
      {
        user_id: userId,
        domain_key: kpi.domainKey,
        period_start: startStr,
        period_end: endStr,
        score: kpi.score,
        metrics: kpi.metrics,
      },
      { onConflict: "user_id,domain_key,period_start,period_end" }
    );
  }

  console.log(`[Executive] Computed KPIs for ${userId}: ${startStr} to ${endStr}`);
}

/**
 * Generate executive summary for a period
 */
export async function generateExecutiveSummary(
  userId: string,
  period: { start: Date; end: Date }
): Promise<ExecutiveSummary | null> {
  const startStr = formatDate(period.start);
  const endStr = formatDate(period.end);

  // Get domain KPIs for this period
  const { data: kpis } = await supabaseAdmin
    .from("domain_kpis")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", startStr)
    .eq("period_end", endStr);

  if (!kpis || kpis.length === 0) {
    // Compute KPIs first
    await recomputeDomainKPIs({ userId, startDate: period.start, endDate: period.end });

    const { data: freshKpis } = await supabaseAdmin
      .from("domain_kpis")
      .select("*")
      .eq("user_id", userId)
      .eq("period_start", startStr)
      .eq("period_end", endStr);

    if (!freshKpis || freshKpis.length === 0) {
      return null;
    }
  }

  const kpiData = kpis || [];
  const domainScores: Record<string, number> = {};
  let totalScore = 0;
  let totalWeight = 0;

  // Get domain weights
  const domains = await getUserDomains(userId);
  const domainWeights: Record<string, number> = {};
  domains.forEach((d) => {
    domainWeights[d.key] = d.weight;
  });

  for (const kpi of kpiData) {
    domainScores[kpi.domain_key] = kpi.score;
    const weight = domainWeights[kpi.domain_key] || 1;
    totalScore += kpi.score * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

  // Generate AI summary
  const aiResult = await callAIJson<AIExecutiveSummary>({
    userId,
    feature: "executive_summary",
    systemPrompt: `You are a personal executive coach generating weekly life reports. Be concise, actionable, and encouraging. Output ONLY valid JSON.`,
    userPrompt: `Generate an executive summary for this week.

Domain Scores (0-100):
${Object.entries(domainScores)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

Overall Score: ${overallScore}

Detailed Metrics:
${JSON.stringify(kpiData.map((k) => ({ domain: k.domain_key, score: k.score, metrics: k.metrics })), null, 2)}

Output as JSON:
{
  "summary": "2-3 sentence executive overview",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "concerns": ["concern1", "concern2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}`,
    maxTokens: 800,
    temperature: 0.4,
  });

  const aiSummary = aiResult.success && aiResult.data
    ? aiResult.data
    : {
        summary: `Your overall score this week is ${overallScore}. Review your domain performance for details.`,
        highlights: [],
        concerns: [],
        recommendations: [],
      };

  // Determine period type
  const daysDiff = Math.ceil(
    (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const periodType = daysDiff > 14 ? "monthly" : "weekly";

  // Save summary
  const { data: saved, error } = await supabaseAdmin
    .from("executive_summaries")
    .upsert(
      {
        user_id: userId,
        period_type: periodType,
        period_start: startStr,
        period_end: endStr,
        overall_score: overallScore,
        summary: aiSummary.summary,
        highlights: aiSummary.highlights,
        concerns: aiSummary.concerns,
        recommendations: aiSummary.recommendations,
        domain_scores: domainScores,
      },
      { onConflict: "user_id,period_type,period_start" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("[Executive] Error saving summary:", error);
    return null;
  }

  return mapRowToSummary(saved);
}

/**
 * Get latest executive summary
 */
export async function getLatestExecutiveSummary(
  userId: string
): Promise<ExecutiveSummary | null> {
  const { data } = await supabaseAdmin
    .from("executive_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("period_start", { ascending: false })
    .limit(1)
    .single();

  return data ? mapRowToSummary(data) : null;
}

/**
 * Get domain KPIs for a period
 */
export async function getDomainKPIs(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<DomainKPI[]> {
  const { data } = await supabaseAdmin
    .from("domain_kpis")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", formatDate(startDate))
    .eq("period_end", formatDate(endDate));

  return (data || []).map((row) => ({
    domainKey: row.domain_key,
    score: row.score,
    metrics: row.metrics,
  }));
}

// ============================================
// METRIC COMPUTATION HELPERS
// ============================================

async function computeHabitMetrics(
  userId: string,
  start: Date,
  end: Date
): Promise<Record<string, any>> {
  const { data: logs } = await supabaseAdmin
    .from("habit_logs")
    .select("habit_id, completed_at")
    .eq("user_id", userId)
    .gte("completed_at", start.toISOString())
    .lte("completed_at", end.toISOString());

  const { data: habits } = await supabaseAdmin
    .from("habits")
    .select("id, name, category")
    .eq("user_id", userId);

  const totalLogs = logs?.length || 0;
  const uniqueHabits = new Set(logs?.map((l) => l.habit_id)).size;
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // Category breakdown
  const categoryCount: Record<string, number> = {};
  const habitMap = new Map(habits?.map((h) => [h.id, h]) || []);

  logs?.forEach((log) => {
    const habit = habitMap.get(log.habit_id);
    if (habit?.category) {
      categoryCount[habit.category] = (categoryCount[habit.category] || 0) + 1;
    }
  });

  return {
    totalCompletions: totalLogs,
    uniqueHabits,
    avgPerDay: days > 0 ? Math.round((totalLogs / days) * 10) / 10 : 0,
    categoryBreakdown: categoryCount,
    healthHabits: categoryCount["health"] || categoryCount["fitness"] || 0,
    recoveryHabits: categoryCount["rest"] || categoryCount["sleep"] || categoryCount["recovery"] || 0,
  };
}

async function computeJournalMetrics(
  userId: string,
  start: Date,
  end: Date
): Promise<Record<string, any>> {
  const { data: entries } = await supabaseAdmin
    .from("journal_entries")
    .select("id, mood, tags, created_at")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  const totalEntries = entries?.length || 0;
  const moodCounts: Record<string, number> = {};
  const allTags: string[] = [];

  entries?.forEach((e) => {
    if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    if (e.tags) allTags.push(...(Array.isArray(e.tags) ? e.tags : []));
  });

  // Calculate average mood score
  const moodScores: Record<string, number> = {
    great: 100,
    good: 75,
    okay: 50,
    bad: 25,
    terrible: 0,
  };

  let moodSum = 0;
  let moodCount = 0;
  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (moodScores[mood] !== undefined) {
      moodSum += moodScores[mood] * count;
      moodCount += count;
    }
  });

  return {
    totalEntries,
    avgMoodScore: moodCount > 0 ? Math.round(moodSum / moodCount) : 50,
    moodDistribution: moodCounts,
    topTags: getTopItems(allTags, 5),
  };
}

async function computeRelationshipMetrics(
  userId: string,
  start: Date,
  end: Date
): Promise<Record<string, any>> {
  const { data: events } = await supabaseAdmin
    .from("third_brain_events")
    .select("type, title, raw_payload")
    .eq("user_id", userId)
    .eq("type", "call")
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString());

  const { data: memories } = await supabaseAdmin
    .from("third_brain_memories")
    .select("key, content, metadata")
    .eq("user_id", userId)
    .eq("category", "relationship");

  const totalCalls = events?.length || 0;
  const uniqueContacts = new Set(
    events?.map((e) => e.raw_payload?.contactName || e.raw_payload?.contactId)
  ).size;

  // Count relationships by trend
  let warming = 0,
    stable = 0,
    cooling = 0;
  memories?.forEach((m) => {
    const trend = m.metadata?.trend;
    if (trend === "warming") warming++;
    else if (trend === "cooling" || trend === "gone_quiet") cooling++;
    else stable++;
  });

  return {
    totalCalls,
    uniqueContacts,
    relationshipCount: memories?.length || 0,
    trends: { warming, stable, cooling },
  };
}

async function computeTaskMetrics(
  userId: string,
  start: Date,
  end: Date
): Promise<Record<string, any>> {
  const { data: events } = await supabaseAdmin
    .from("third_brain_events")
    .select("type, title")
    .eq("user_id", userId)
    .in("type", ["task_completed", "quest_completed"])
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString());

  const { data: planItems } = await supabaseAdmin
    .from("plan_items")
    .select("status")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  const totalCompleted = events?.length || 0;
  const planItemsTotal = planItems?.length || 0;
  const planItemsCompleted = planItems?.filter((p) => p.status === "completed").length || 0;

  return {
    tasksCompleted: totalCompleted,
    planItems: planItemsTotal,
    planItemsCompleted,
    planCompletionRate:
      planItemsTotal > 0 ? Math.round((planItemsCompleted / planItemsTotal) * 100) : 0,
  };
}

async function computeXPMetrics(
  userId: string,
  start: Date,
  end: Date
): Promise<Record<string, any>> {
  const { data: transactions } = await supabaseAdmin
    .from("xp_transactions")
    .select("amount, source")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  const totalXP = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const sourceBreakdown: Record<string, number> = {};

  transactions?.forEach((t) => {
    if (t.source) {
      sourceBreakdown[t.source] = (sourceBreakdown[t.source] || 0) + t.amount;
    }
  });

  return {
    totalXP,
    transactionCount: transactions?.length || 0,
    sourceBreakdown,
  };
}

// ============================================
// SCORE COMPUTATION
// ============================================

function computeWorkScore(tasks: Record<string, any>, xp: Record<string, any>): number {
  const taskScore = Math.min(100, (tasks.tasksCompleted || 0) * 5);
  const planScore = tasks.planCompletionRate || 0;
  const xpScore = Math.min(100, (xp.totalXP || 0) / 10);

  return Math.round((taskScore * 0.3 + planScore * 0.4 + xpScore * 0.3));
}

function computeHealthScore(habits: Record<string, any>): number {
  const healthCompletions = habits.healthHabits || 0;
  const avgPerDay = habits.avgPerDay || 0;

  // Ideal: 3+ health habits per day
  const habitScore = Math.min(100, (avgPerDay / 3) * 100);
  const healthBonus = Math.min(20, healthCompletions * 2);

  return Math.round(Math.min(100, habitScore + healthBonus));
}

function computeRelationshipScore(relationships: Record<string, any>): number {
  const callScore = Math.min(50, (relationships.totalCalls || 0) * 5);
  const contactScore = Math.min(30, (relationships.uniqueContacts || 0) * 10);

  const trends = relationships.trends || {};
  const trendScore =
    (trends.warming || 0) * 10 - (trends.cooling || 0) * 5 + (trends.stable || 0) * 2;

  return Math.round(Math.min(100, callScore + contactScore + Math.max(0, trendScore)));
}

function computeGrowthScore(journal: Record<string, any>, xp: Record<string, any>): number {
  const journalScore = Math.min(40, (journal.totalEntries || 0) * 5);
  const moodScore = (journal.avgMoodScore || 50) * 0.3;
  const xpScore = Math.min(30, (xp.totalXP || 0) / 20);

  return Math.round(journalScore + moodScore + xpScore);
}

function computeRecoveryScore(habits: Record<string, any>, journal: Record<string, any>): number {
  const recoveryHabits = habits.recoveryHabits || 0;
  const moodScore = journal.avgMoodScore || 50;

  const habitScore = Math.min(50, recoveryHabits * 10);
  const moodBonus = moodScore * 0.5;

  return Math.round(Math.min(100, habitScore + moodBonus));
}

// ============================================
// HELPERS
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getTopItems(items: string[], limit: number): string[] {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item);
}

function mapRowToSummary(row: any): ExecutiveSummary {
  return {
    id: row.id,
    userId: row.user_id,
    periodType: row.period_type,
    periodStart: new Date(row.period_start),
    periodEnd: new Date(row.period_end),
    overallScore: row.overall_score,
    summary: row.summary,
    highlights: row.highlights || [],
    concerns: row.concerns || [],
    recommendations: row.recommendations || [],
    domainScores: row.domain_scores || {},
  };
}
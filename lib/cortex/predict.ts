// Neocortex Predictor & Anomaly Engine
// lib/cortex/predict.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CortexPrediction, CortexAnomaly } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function detectWorkAnomaliesForUser(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const windowDate = date.toISOString().slice(0, 10);

  // 1. Load today's signals
  const { data: todaySignals, error: todayError } = await supabaseAdmin
    .from('cortex_signals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .eq('window_date', windowDate);

  if (todayError) throw todayError;

  if (!todaySignals || todaySignals.length === 0) {
    return; // No signals yet today
  }

  // 2. Load historical signals for baseline (last 30 days)
  const thirtyDaysAgo = new Date(date);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const { data: historicalSignals, error: histError } = await supabaseAdmin
    .from('cortex_signals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .gte('window_date', startDate)
    .lt('window_date', windowDate)
    .eq('scope', 'global');

  if (histError) throw histError;

  // 3. Compute anomalies (simple statistical approach)
  const anomalies: CortexAnomaly[] = [];

  // Group historical signals by key
  const historicalByKey: Record<string, number[]> = {};
  (historicalSignals || []).forEach(s => {
    if (s.key && s.value_numeric !== null) {
      if (!historicalByKey[s.key]) {
        historicalByKey[s.key] = [];
      }
      historicalByKey[s.key].push(s.value_numeric);
    }
  });

  // Check each today signal against historical baseline
  todaySignals.forEach(signal => {
    if (!signal.key || signal.value_numeric === null) return;

    const historical = historicalByKey[signal.key] || [];
    if (historical.length < 5) return; // Need at least 5 data points

    // Compute mean and stddev
    const mean = historical.reduce((sum, val) => sum + val, 0) / historical.length;
    const variance = historical.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historical.length;
    const stddev = Math.sqrt(variance);

    // Check if today's value is >2 stddev away
    const deviation = Math.abs(signal.value_numeric - mean);
    if (stddev > 0 && deviation > 2 * stddev) {
      const severity = Math.min(1.0, deviation / (3 * stddev)); // Cap at 1.0

      anomalies.push({
        userId,
        areaKey: 'work',
        windowDate,
        scope: signal.scope || 'global',
        scopeRef: signal.scope_ref || undefined,
        severity,
        summary: `${signal.key} is ${signal.value_numeric > mean ? 'unusually high' : 'unusually low'} today (${signal.value_numeric.toFixed(1)} vs avg ${mean.toFixed(1)})`,
        expected: { mean, stddev, value: mean },
        observed: { value: signal.value_numeric },
      });
    }
  });

  if (anomalies.length === 0) return;

  // 4. Insert anomalies
  // Resolve all user IDs first
  const resolvedRows = await Promise.all(
    anomalies.map(async (a) => ({
      user_id: await resolveUserId(a.userId),
      area_key: a.areaKey,
      window_date: a.windowDate,
      scope: a.scope,
      scope_ref: a.scopeRef ?? null,
      severity: a.severity,
      summary: a.summary,
      expected: a.expected || {},
      observed: a.observed || {},
    }))
  );

  const { error: insertError } = await supabaseAdmin
    .from('cortex_anomalies')
    .insert(resolvedRows);

  if (insertError) throw insertError;
}

export async function refreshWorkPredictionsForUser(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const windowDate = date.toISOString().slice(0, 10);

  // 1. Load patterns
  const { data: patterns, error: patternsError } = await supabaseAdmin
    .from('cortex_patterns')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .gt('strength', 0.5);

  if (patternsError) throw patternsError;

  // 2. Load today's partial signals
  const { data: todaySignals, error: signalsError } = await supabaseAdmin
    .from('cortex_signals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .eq('window_date', windowDate);

  if (signalsError) throw signalsError;

  // 3. Build LLM input
  const summaryInput = {
    today: windowDate,
    todaySignals: (todaySignals || []).map(s => ({
      key: s.key,
      value: s.value_numeric,
    })),
    activePatterns: (patterns || []).map(p => ({
      key: p.key,
      name: p.name,
      strength: p.strength,
    })),
  };

  // 4. Call LLM for predictions
  const result = await callAIJson<{
    predictions: CortexPrediction[];
  }>({
    userId,
    feature: 'cortex_predictions',
    systemPrompt: `You are the Neocortex for an AI life operating system.
You see today's partial work signals and active patterns.

Generate predictions for:
- Today (based on partial signals)
- This week (based on patterns)

Return JSON: { "predictions": [ { "kind": "risk" | "opportunity" | "forecast", "targetScope": "day" | "week", "horizon": "today" | "this_week", "summary": "...", "confidence": 0.0-1.0 } ] }

Only return valid JSON.`,
    userPrompt: `Generate predictions:\n\n${JSON.stringify(summaryInput, null, 2)}`,
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Cortex] Failed to generate predictions', result.error);
    return;
  }

  const { predictions } = result.data;

  if (!predictions || predictions.length === 0) {
    return;
  }

  // 5. Upsert predictions
  const patternIdMap = new Map((patterns || []).map(p => [p.key, p.id]));

  const rows = predictions.map((p) => ({
    user_id: dbUserId,
    area_key: p.areaKey || 'work',
    kind: p.kind,
    target_scope: p.targetScope,
    target_ref: p.targetRef || windowDate,
    horizon: p.horizon,
    summary: p.summary,
    details: p.details || {},
    confidence: p.confidence || 0.5,
    pattern_ids: p.patternIds?.map(id => patternIdMap.get(id) || id).filter(Boolean) || [],
    valid_until: p.validUntil?.toISOString() || new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
  }));

  const { error: upsertError } = await supabaseAdmin
    .from('cortex_predictions')
    .insert(rows);

  if (upsertError) throw upsertError;
}



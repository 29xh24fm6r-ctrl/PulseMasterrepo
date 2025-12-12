// Neocortex Patterns Engine
// lib/cortex/patterns.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CortexPattern } from './types';
import { subDays } from 'date-fns';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const WORK_PATTERN_SYSTEM_PROMPT = `
You are the Neocortex for an AI life operating system.
You receive time-series work signals for a single user over several weeks.

Your job:
1. Detect recurring patterns in daily behavior.
2. Identify correlations between signals (e.g., deep work and completed tasks).
3. Name each pattern, explain it in plain language, and rate its strength from 0 to 1.
4. Provide examples (dates) where the pattern is strongly present.

Return JSON:
{
  "patterns": [
    {
      "areaKey": "work",
      "key": "monday_morning_deep_work",
      "name": "Strong Monday Morning Deep Work",
      "description": "...",
      "patternType": "time_series",
      "signalKeys": ["deep_work_minutes", "completed_tasks_count"],
      "stats": { ... },
      "examples": [{ "windowDate": "YYYY-MM-DD", "notes": "..." }],
      "strength": 0.85,
      "lastObservedAt": "YYYY-MM-DDTHH:MM:SSZ"
    }
  ]
}

Only return valid JSON.`;

function buildSignalSummaryForLLM(signals: any[]): string {
  // Group signals by date and key
  const byDate: Record<string, Record<string, number>> = {};
  
  signals.forEach(s => {
    const date = s.window_date;
    if (!byDate[date]) {
      byDate[date] = {};
    }
    byDate[date][s.key] = s.value_numeric || 0;
  });

  // Build compact summary
  const summary = {
    dateRange: {
      start: Object.keys(byDate).sort()[0],
      end: Object.keys(byDate).sort().slice(-1)[0],
    },
    dailySignals: Object.entries(byDate).map(([date, values]) => ({
      date,
      signals: values,
    })),
  };

  return JSON.stringify(summary, null, 2);
}

export async function refreshWorkPatternsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);
  const sixtyDaysAgo = subDays(new Date(), 60).toISOString().slice(0, 10);

  // 1. Load recent signals
  const { data: signals, error } = await supabaseAdmin
    .from('cortex_signals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .gte('window_date', sixtyDaysAgo)
    .order('window_date', { ascending: true });

  if (error) throw error;

  if (!signals || signals.length === 0) {
    console.log('[Cortex] No signals found for pattern detection');
    return;
  }

  // 2. Aggregate into a compact JSON for LLM
  const summaryInput = buildSignalSummaryForLLM(signals);

  // 3. Call LLM with JSON mode
  const result = await callAIJson<{
    patterns: CortexPattern[];
  }>({
    userId,
    feature: 'cortex_patterns',
    systemPrompt: WORK_PATTERN_SYSTEM_PROMPT,
    userPrompt: `Analyze these work signals and detect patterns:\n\n${summaryInput}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Cortex] Failed to generate patterns', result.error);
    return;
  }

  const { patterns } = result.data;

  if (!patterns || patterns.length === 0) {
    console.log('[Cortex] No patterns detected by LLM');
    return;
  }

  // 4. Upsert into cortex_patterns
  const rows = patterns.map((p) => ({
    user_id: dbUserId,
    area_key: p.areaKey,
    key: p.key,
    name: p.name,
    description: p.description,
    pattern_type: p.patternType,
    signal_keys: p.signalKeys,
    stats: p.stats || {},
    examples: p.examples || [],
    strength: p.strength,
    last_observed_at: p.lastObservedAt?.toISOString() ?? null,
  }));

  const { error: upsertError } = await supabaseAdmin
    .from('cortex_patterns')
    .upsert(rows, { onConflict: 'user_id,area_key,key' });

  if (upsertError) throw upsertError;
}



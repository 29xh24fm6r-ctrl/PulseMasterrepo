// Brain Diagnostics Engine
// lib/brain/registry/diagnostics.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { BrainHealthSnapshot } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const BRAIN_DIAGNOSTICS_PROMPT = `
You are the Brain Diagnostics Engine for Pulse.

You see:
- A BrainHealthSnapshot (overallHealth, coverage, errorPressure, latency, freshness).
- Per-subsystem status and health scores.
- Recent brain_error_events.

Your job:
1. Explain in plain language how healthy the user's Pulse Brain is right now.
2. Identify 3–7 keyIssues:
   - label, description, severity (0..1).
3. Suggest:
   - quickWins: easy fixes or simple actions to immediately improve reliability or usefulness.
   - deeperFixes: structural improvements (e.g., "retrain this coach", "review autopilot rules").
4. Provide uiHints:
   - How the UI should visualize status (colors, icons, suggested cards).
   - Which subsystems to highlight as "online", "warming up", or "needs attention".

Be honest, but reassuring and constructive. Avoid alarmist tone.

Return JSON: { "diagnostics": { ... } }.

Only return valid JSON.`;

export async function generateBrainDiagnosticsForUser(
  userId: string,
  snapshotId?: string
) {
  const dbUserId = await resolveUserId(userId);

  let snapshotRow: any | null = null;

  if (snapshotId) {
    const { data } = await supabaseAdmin
      .from('brain_health_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('id', snapshotId)
      .limit(1);
    snapshotRow = data?.[0] ?? null;
  } else {
    const { data } = await supabaseAdmin
      .from('brain_health_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1);
    snapshotRow = data?.[0] ?? null;
  }

  if (!snapshotRow) return null;

  const [{ data: statusRows }, { data: errorRows }] = await Promise.all([
    supabaseAdmin
      .from('brain_subsystem_status')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('brain_error_events')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('occurred_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  const snapshot: BrainHealthSnapshot = {
    overallHealth: snapshotRow.overall_health,
    coverageScore: snapshotRow.coverage_score,
    errorPressure: snapshotRow.error_pressure,
    latencyPressure: snapshotRow.latency_pressure,
    dataFreshnessScore: snapshotRow.data_freshness_score,
    subsystemScores: snapshotRow.subsystem_scores ?? {},
    missingSubsystems: snapshotRow.missing_subsystems ?? [],
    notes: snapshotRow.notes ?? undefined,
    recommendations: snapshotRow.recommendations ?? undefined,
  };

  const result = await callAIJson<{
    diagnostics: {
      summary: string;
      keyIssues: Array<{ label: string; description: string; severity: number }>;
      quickWins: Array<{ label: string; description: string }>;
      deeperFixes: Array<{ label: string; description: string }>;
      uiHints: any;
    };
  }>({
    userId,
    feature: 'brain_diagnostics',
    systemPrompt: BRAIN_DIAGNOSTICS_PROMPT,
    userPrompt: JSON.stringify({
      snapshot,
      subsystemStatus: (statusRows ?? []).map((s: any) => ({
        subsystemId: s.subsystem_id,
        status: s.status,
        healthScore: s.health_score,
        lastRunAt: s.last_run_at,
        lastErrorAt: s.last_error_at,
      })),
      recentErrors: (errorRows ?? []).slice(0, 20).map((e: any) => ({
        subsystemId: e.subsystem_id,
        severity: e.severity,
        errorCode: e.error_code,
        message: e.message,
        occurredAt: e.occurred_at,
      })),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Brain Diagnostics] Failed to generate diagnostics', result.error);
    return null;
  }

  const { diagnostics } = result.data;

  // Persist summary and recommendations
  const { error } = await supabaseAdmin
    .from('brain_health_snapshots')
    .update({
      notes: diagnostics.summary,
      recommendations: {
        keyIssues: diagnostics.keyIssues ?? [],
        quickWins: diagnostics.quickWins ?? [],
        deeperFixes: diagnostics.deeperFixes ?? [],
        uiHints: diagnostics.uiHints ?? {},
      },
    })
    .eq('id', snapshotRow.id);

  if (error) throw error;

  return diagnostics;
}



// Brain Health Computation
// lib/brain/registry/health.ts

import { supabaseAdmin } from '@/lib/supabase';
import { BrainHealthSnapshot } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function computeBrainHealthSnapshotForUser(
  userId: string,
  now: Date
): Promise<{ snapshotId: string; snapshot: BrainHealthSnapshot }> {
  const dbUserId = await resolveUserId(userId);
  const nowIso = now.toISOString();

  const [{ data: subsystems }, { data: statusRows }, { data: recentErrors }] = await Promise.all([
    supabaseAdmin.from('brain_subsystems').select('*'),
    supabaseAdmin
      .from('brain_subsystem_status')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('brain_error_events')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('occurred_at', new Date(now.getTime() - 7 * 86400000).toISOString()), // last 7 days
  ]);

  const subsById = Object.fromEntries((subsystems ?? []).map((s: any) => [s.id, s]));
  const statusById: Record<string, any> = {};
  for (const s of statusRows ?? []) statusById[s.subsystem_id] = s;

  // Compute subsystem scores & coverage
  const subsystemScores: Record<string, number> = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const missingSubsystems: string[] = [];

  for (const s of subsystems ?? []) {
    const status = statusById[s.id];
    const weight = Number(s.weight ?? 1);

    let score = 0;
    if (!status) {
      // expected but missing
      if (s.criticality === 'core' || s.criticality === 'important') {
        missingSubsystems.push(s.id);
      }
      score = 0;
    } else if (status.health_score != null) {
      score = Number(status.health_score);
    } else {
      // derive simple score from status
      score =
        status.status === 'active'
          ? 1
          : status.status === 'partial'
          ? 0.7
          : status.status === 'degraded'
          ? 0.4
          : status.status === 'initializing'
          ? 0.5
          : status.status === 'inactive'
          ? 0.2
          : 0.1; // 'error'
    }

    subsystemScores[s.id] = score;
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }

  const overallHealth = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  // Error pressure: more errors -> higher pressure
  const errorCount = (recentErrors ?? []).length;
  const criticalCount = (recentErrors ?? []).filter((e: any) => e.severity === 'critical').length;
  const errorPressure = Math.min(1, (errorCount + 2 * criticalCount) / 20); // heuristic

  // Latency & freshness heuristics via status timestamps
  const nowMs = now.getTime();
  let latencyPressure = 0;
  let freshnessScore = 1;

  for (const s of statusRows ?? []) {
    if (!s.last_run_at) continue;
    const lastRun = new Date(s.last_run_at).getTime();
    const diffHours = (nowMs - lastRun) / 3600000;

    // Basic heuristic: if last run > 24h for core subsystems, penalize
    const def = subsById[s.subsystem_id];
    const isCore = def?.criticality === 'core';

    if (isCore && diffHours > 24) {
      latencyPressure = Math.min(1, latencyPressure + (diffHours - 24) / 24);
      freshnessScore = Math.max(0, freshnessScore - 0.2);
    }
  }

  const coverageScore =
    (Object.keys(statusById).length > 0 && (subsystems ?? []).length > 0)
      ? Object.keys(statusById).length / (subsystems ?? []).length
      : 0;

  const snapshot: BrainHealthSnapshot = {
    overallHealth,
    coverageScore,
    errorPressure,
    latencyPressure,
    dataFreshnessScore: freshnessScore,
    subsystemScores,
    missingSubsystems,
    notes: undefined,
    recommendations: undefined,
  };

  // Insert snapshot row
  const { data: row, error } = await supabaseAdmin
    .from('brain_health_snapshots')
    .insert({
      user_id: dbUserId,
      snapshot_time: nowIso,
      overall_health: snapshot.overallHealth,
      coverage_score: snapshot.coverageScore,
      error_pressure: snapshot.errorPressure,
      latency_pressure: snapshot.latencyPressure,
      data_freshness_score: snapshot.dataFreshnessScore,
      subsystem_scores: snapshot.subsystemScores,
      missing_subsystems: snapshot.missingSubsystems,
      notes: null,
      recommendations: {},
    })
    .select('id');

  if (error) throw error;
  const snapshotId = row?.[0]?.id as string;

  return { snapshotId, snapshot };
}



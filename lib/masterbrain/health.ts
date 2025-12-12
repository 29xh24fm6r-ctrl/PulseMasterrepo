// Master Brain Registry + Diagnostics v1 - Health Engine
// lib/masterbrain/health.ts

import { supabaseAdminClient } from '../supabase/admin';
import { ModuleHealth, ModuleStatus } from './types';
import { getModuleByKey } from './registry';

export async function runModuleHealthCheck(moduleKey: string): Promise<ModuleHealth | null> {
  const module = await getModuleByKey(moduleKey);
  if (!module) return null;

  // Get capabilities for this module
  const { data: capabilities } = await supabaseAdminClient
    .from('system_capabilities')
    .select('*')
    .eq('module_id', module.id);

  if (!capabilities || capabilities.length === 0) {
    // No API routes to check, mark as ok
    const { data: health } = await supabaseAdminClient
      .from('system_module_health')
      .insert({
        module_id: module.id,
        status: 'ok',
        status_reason: 'No API routes to check',
        error_count: 0,
        avg_latency_ms: null,
        last_check_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    return health;
  }

  // For v1, we'll do a simple check: look at recent metrics
  // In production, you'd make actual API calls
  const { data: recentMetrics } = await supabaseAdminClient
    .from('system_module_metrics')
    .select('*')
    .eq('module_id', module.id)
    .order('date', { ascending: false })
    .limit(7);

  const totalErrors = recentMetrics?.reduce((sum, m) => sum + (m.error_count ?? 0), 0) ?? 0;
  const avgLatency = recentMetrics?.length
    ? Math.round(
        recentMetrics.reduce((sum, m) => sum + (m.avg_latency_ms ?? 0), 0) / recentMetrics.length
      )
    : null;

  let status: ModuleStatus = 'ok';
  let statusReason: string | null = null;

  if (totalErrors > 10) {
    status = 'error';
    statusReason = `High error count: ${totalErrors} errors in last 7 days`;
  } else if (avgLatency && avgLatency > 2000) {
    status = 'degraded';
    statusReason = `High latency: ${avgLatency}ms average`;
  } else if (totalErrors > 0) {
    status = 'degraded';
    statusReason = `${totalErrors} errors in last 7 days`;
  }

  const { data: health } = await supabaseAdminClient
    .from('system_module_health')
    .insert({
      module_id: module.id,
      status,
      status_reason: statusReason,
      error_count: totalErrors,
      last_error_at: recentMetrics?.find((m) => m.error_count > 0)?.last_invocation_at ?? null,
      avg_latency_ms: avgLatency,
      last_check_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  return health;
}

export async function runAllHealthChecks(): Promise<ModuleHealth[]> {
  const { listSystemModules } = await import('./registry');
  const modules = await listSystemModules();

  const healthChecks = await Promise.all(
    modules.map((m) => runModuleHealthCheck(m.key))
  );

  return healthChecks.filter((h): h is ModuleHealth => h !== null);
}

export async function recordModuleInvocation(params: {
  moduleKey: string;
  latencyMs: number;
  success: boolean;
  userTouch?: boolean;
}): Promise<void> {
  const module = await getModuleByKey(params.moduleKey);
  if (!module) return;

  const today = new Date().toISOString().slice(0, 10);

  // Get or create today's metrics
  const { data: existing } = await supabaseAdminClient
    .from('system_module_metrics')
    .select('*')
    .eq('module_id', module.id)
    .eq('date', today)
    .maybeSingle();

  const currentInvocationCount = existing?.invocation_count ?? 0;
  const currentErrorCount = existing?.error_count ?? 0;
  const currentLatencySum = (existing?.avg_latency_ms ?? 0) * currentInvocationCount;
  const newInvocationCount = currentInvocationCount + 1;
  const newLatencySum = currentLatencySum + params.latencyMs;
  const newAvgLatency = Math.round(newLatencySum / newInvocationCount);

  const updateData = {
    invocation_count: newInvocationCount,
    error_count: params.success ? currentErrorCount : currentErrorCount + 1,
    avg_latency_ms: newAvgLatency,
    user_touch_count: params.userTouch
      ? (existing?.user_touch_count ?? 0) + 1
      : existing?.user_touch_count ?? 0,
    last_invocation_at: new Date().toISOString(),
  };

  if (existing) {
    await supabaseAdminClient
      .from('system_module_metrics')
      .update(updateData)
      .eq('id', existing.id);
  } else {
    await supabaseAdminClient
      .from('system_module_metrics')
      .insert({
        module_id: module.id,
        date: today,
        ...updateData,
      });
  }
}



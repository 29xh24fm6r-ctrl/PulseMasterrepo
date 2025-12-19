// Master Brain Registry + Diagnostics v1 - System Narrator
// lib/masterbrain/narrator.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAI } from '@/lib/ai/call';
import { listSystemModules } from './registry';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function summarizeDiagnosticsForUser(userId: string): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  // Get latest diagnostics run
  const { data: latestRun } = await supabaseAdmin
    .from('system_diagnostics_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRun) {
    return 'No diagnostics have been run yet. Run diagnostics to get a system status summary.';
  }

  // Get findings
  const { data: findings } = await supabaseAdmin
    .from('system_diagnostics_findings')
    .select('*, system_modules(*)')
    .eq('run_id', latestRun.id)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false });

  // Get module health
  const modules = await listSystemModules();
  const { data: moduleHealth } = await supabaseAdmin
    .from('system_module_health')
    .select('*, system_modules(*)')
    .in(
      'module_id',
      modules.map((m) => m.id)
    )
    .order('last_check_at', { ascending: false });

  // Get recent metrics
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: recentMetrics } = await supabaseAdmin
    .from('system_module_metrics')
    .select('*, system_modules(*)')
    .gte('date', sevenDaysAgoStr)
    .order('date', { ascending: false });

  // Build context for LLM
  const findingsSummary = findings?.map((f: any) => ({
    severity: f.severity,
    category: f.category,
    module: f.system_modules?.name,
    title: f.title,
    recommendation: f.recommendation,
  })) ?? [];

  const healthSummary = moduleHealth?.map((h: any) => ({
    module: h.system_modules?.name,
    status: h.status,
    reason: h.status_reason,
  })) ?? [];

  const usageSummary = recentMetrics?.reduce((acc: any, m: any) => {
    const moduleName = m.system_modules?.name ?? 'Unknown';
    const existing = acc.find((a: any) => a.module === moduleName);
    if (existing) {
      existing.invocations += m.invocation_count ?? 0;
    } else {
      acc.push({
        module: moduleName,
        invocations: m.invocation_count ?? 0,
      });
    }
    return acc;
  }, []) ?? [];

  const result = await callAI({
    userId,
    feature: 'master_brain_narrator',
    systemPrompt: `You are the System Narrator for Pulse's Master Brain. You summarize the health and status of all Pulse systems in a friendly, helpful, and concise way.

Write in second person ("Your..."). Be specific about what's working, what needs attention, and what actions to take. Keep it to 3-5 paragraphs.`,
    userPrompt: `Latest Diagnostics Run: ${latestRun.summary ?? 'No summary'}

Findings:
${JSON.stringify(findingsSummary, null, 2)}

Module Health:
${JSON.stringify(healthSummary, null, 2)}

Recent Usage (last 7 days):
${JSON.stringify(usageSummary, null, 2)}

Generate a system status narrative now.`,
    maxTokens: 1000,
    temperature: 0.7,
  });

  if (!result.success || !result.text) {
    // Fallback summary
    const criticalCount = findings?.filter((f: any) => f.severity === 'critical').length ?? 0;
    const warningCount = findings?.filter((f: any) => f.severity === 'warning').length ?? 0;

    if (criticalCount > 0) {
      return `Your Pulse systems need attention: ${criticalCount} critical issue(s) and ${warningCount} warning(s) detected. Check the findings for details.`;
    } else if (warningCount > 0) {
      return `Your Pulse systems are mostly healthy, but ${warningCount} warning(s) need attention. Check the findings for recommendations.`;
    } else {
      return 'Your Pulse systems are healthy and operating normally.';
    }
  }

  return result.text;
}



// Master Brain Registry + Diagnostics v1 - Diagnostics Engine
// lib/masterbrain/diagnostics.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DiagnosticsRun, DiagnosticsFinding, DiagnosticsSeverity } from './types';
import { listSystemModules } from './registry';
import { runAllHealthChecks } from './health';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runDiagnostics(params: {
  runType: 'daily' | 'manual' | 'post_deploy';
  initiatedBy: string; // 'system' or 'user:<id>' or 'deploy_hook'
}): Promise<{
  run: DiagnosticsRun;
  findings: DiagnosticsFinding[];
}> {
  // Create run record
  const { data: run, error: runError } = await supabaseAdmin
    .from('system_diagnostics_runs')
    .insert({
      run_type: params.runType,
      initiated_by: params.initiatedBy,
      status: 'in_progress',
      summary: null,
    })
    .select('*')
    .single();

  if (runError) throw runError;

  const findings: DiagnosticsFinding[] = [];

  try {
    // 1. Health Checks
    const healthChecks = await runAllHealthChecks();
    const modules = await listSystemModules();

    for (const health of healthChecks) {
      const module = modules.find((m) => m.id === health.module_id);
      if (!module) continue;

      if (health.status === 'error') {
        findings.push({
          id: '', // Will be set on insert
          run_id: run.id,
          severity: 'critical',
          category: 'health',
          module_id: module.id,
          capability_id: null,
          title: `${module.name} is in error state`,
          description: health.status_reason ?? 'Module is reporting errors',
          recommendation: `Check ${module.name} logs and recent activity. Consider restarting or investigating root cause.`,
          created_at: new Date().toISOString(),
        });
      } else if (health.status === 'degraded') {
        findings.push({
          id: '',
          run_id: run.id,
          severity: 'warning',
          category: 'health',
          module_id: module.id,
          capability_id: null,
          title: `${module.name} is degraded`,
          description: health.status_reason ?? 'Module performance is below optimal',
          recommendation: `Monitor ${module.name} closely. Consider investigating latency or error patterns.`,
          created_at: new Date().toISOString(),
        });
      }
    }

    // 2. Usage Checks - Underused modules
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    for (const module of modules) {
      if (module.category !== 'coach' && module.category !== 'simulation') continue;

      const { data: metrics } = await supabaseAdmin
        .from('system_module_metrics')
        .select('*')
        .eq('module_id', module.id)
        .gte('date', sevenDaysAgoStr)
        .order('date', { ascending: false });

      const totalInvocations = metrics?.reduce((sum, m) => sum + (m.invocation_count ?? 0), 0) ?? 0;

      if (totalInvocations === 0) {
        findings.push({
          id: '',
          run_id: run.id,
          severity: 'info',
          category: 'usage',
          module_id: module.id,
          capability_id: null,
          title: `${module.name} has not been used in the last 7 days`,
          description: `This module has no recorded invocations in the past week.`,
          recommendation: `Consider exploring ${module.name} features or integrating it into your workflow.`,
          created_at: new Date().toISOString(),
        });
      }
    }

    // 3. Data Staleness Checks
    const dbUserId = params.initiatedBy.startsWith('user:')
      ? await resolveUserId(params.initiatedBy.replace('user:', ''))
      : null;

    if (dbUserId) {
      // Check mythic profile staleness
      const { data: mythicProfile } = await supabaseAdmin
        .from('user_mythic_profile')
        .select('last_story_refresh_at')
        .eq('user_id', dbUserId)
        .maybeSingle();

      if (mythicProfile?.last_story_refresh_at) {
        const lastRefresh = new Date(mythicProfile.last_story_refresh_at);
        const daysSinceRefresh = Math.floor(
          (new Date().getTime() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceRefresh > 30) {
          const mythicModule = modules.find((m) => m.key === 'mythic_intelligence');
          if (mythicModule) {
            findings.push({
              id: '',
              run_id: run.id,
              severity: 'warning',
              category: 'data_staleness',
              module_id: mythicModule.id,
              capability_id: null,
              title: 'Life chapters are stale',
              description: `Last story refresh was ${daysSinceRefresh} days ago.`,
              recommendation: 'Run `/api/mythic/life/refresh` to update your life chapters and mythic profile.',
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      // Check deal archetype runs
      const { data: latestDealRun } = await supabaseAdmin
        .from('deal_archetype_runs')
        .select('created_at')
        .eq('user_id', dbUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestDealRun) {
        const daysSinceRun = Math.floor(
          (new Date().getTime() - new Date(latestDealRun.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysSinceRun > 14) {
          const mythicModule = modules.find((m) => m.key === 'mythic_intelligence');
          if (mythicModule) {
            findings.push({
              id: '',
              run_id: run.id,
              severity: 'info',
              category: 'usage',
              module_id: mythicModule.id,
              capability_id: null,
              title: 'Deal Archetype Lens has not been used recently',
              description: `Last deal archetype classification was ${daysSinceRun} days ago.`,
              recommendation: 'Consider running deal archetype classification on your active deals.',
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      // Check boardroom decisions
      const { data: openDecisions } = await supabaseAdmin
        .from('decisions')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('status', 'open')
        .order('importance', { ascending: true })
        .order('created_at', { ascending: false });

      if (openDecisions && openDecisions.length > 0) {
        const highImportanceOpen = openDecisions.filter((d: any) => d.importance <= 2);

        if (highImportanceOpen.length > 0) {
          const boardroomModule = modules.find((m) => m.key === 'boardroom_brain');
          if (boardroomModule) {
            findings.push({
              id: '',
              run_id: run.id,
              severity: 'warning',
              category: 'usage',
              module_id: boardroomModule.id,
              capability_id: null,
              title: `${highImportanceOpen.length} high-importance decisions without Boardroom review`,
              description: `You have ${highImportanceOpen.length} open decisions marked as high importance that haven't been reviewed.`,
              recommendation: 'Run Boardroom reviews on your top decisions to get multi-perspective analysis.',
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Insert findings
    if (findings.length > 0) {
      const findingsToInsert = findings.map((f) => ({
        run_id: f.run_id,
        severity: f.severity,
        category: f.category,
        module_id: f.module_id,
        capability_id: f.capability_id,
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
      }));

      const { data: insertedFindings } = await supabaseAdmin
        .from('system_diagnostics_findings')
        .insert(findingsToInsert)
        .select('*');

      // Generate summary
      const criticalCount = findings.filter((f) => f.severity === 'critical').length;
      const warningCount = findings.filter((f) => f.severity === 'warning').length;
      const infoCount = findings.filter((f) => f.severity === 'info').length;

      const summary = `Diagnostics completed: ${criticalCount} critical, ${warningCount} warnings, ${infoCount} info items.`;

      await supabaseAdmin
        .from('system_diagnostics_runs')
        .update({
          status: 'completed',
          summary,
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id);

      return {
        run: { ...run, status: 'completed', summary, completed_at: new Date().toISOString() },
        findings: insertedFindings ?? [],
      };
    }

    // No findings
    const summary = 'Diagnostics completed: All systems healthy.';
    await supabaseAdmin
      .from('system_diagnostics_runs')
      .update({
        status: 'completed',
        summary,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    return {
      run: { ...run, status: 'completed', summary, completed_at: new Date().toISOString() },
      findings: [],
    };
  } catch (err) {
    await supabaseAdmin
      .from('system_diagnostics_runs')
      .update({
        status: 'failed',
        summary: `Diagnostics failed: ${err instanceof Error ? err.message : String(err)}`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    throw err;
  }
}



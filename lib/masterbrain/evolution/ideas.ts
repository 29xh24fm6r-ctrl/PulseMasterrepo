// Master Brain Evolution Engine v1 - Idea Generator
// lib/masterbrain/evolution/ideas.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { ImprovementIdea, IdeaSource, ImpactArea, IdeaSeverity } from './types';
import { listSystemModules } from '../registry';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateImprovementIdeasFromDiagnostics(runId: string): Promise<ImprovementIdea[]> {
  // Get diagnostics findings
  const { data: findings } = await supabaseAdminClient
    .from('system_diagnostics_findings')
    .select('*, system_modules(*), system_capabilities(*)')
    .eq('run_id', runId)
    .order('severity', { ascending: false });

  if (!findings || findings.length === 0) {
    return [];
  }

  const ideas: ImprovementIdea[] = [];

  for (const finding of findings) {
    // Check if idea already exists
    const { data: existing } = await supabaseAdminClient
      .from('system_improvement_ideas')
      .select('*')
      .eq('module_id', finding.module_id ?? '')
      .ilike('title', `%${finding.title}%`)
      .in('status', ['backlog', 'planned', 'in_experiment'])
      .maybeSingle();

    if (existing) continue;

    // Map severity
    const severityMap: Record<string, IdeaSeverity> = {
      critical: 'high',
      warning: 'medium',
      info: 'low',
    };

    // Map category to impact_area
    const impactAreaMap: Record<string, ImpactArea> = {
      health: 'performance',
      usage: 'retention',
      data_staleness: 'accuracy',
      config: 'reliability',
    };

    const ideaData = {
      source: 'diagnostics' as IdeaSource,
      title: finding.title,
      description: finding.description ?? null,
      module_id: finding.module_id,
      capability_id: finding.capability_id,
      severity: severityMap[finding.severity] ?? 'medium',
      impact_area: impactAreaMap[finding.category] ?? 'ux',
      effort_estimate: 'medium' as const,
      status: 'backlog' as const,
      created_by: 'system',
    };

    const { data: idea, error } = await supabaseAdminClient
      .from('system_improvement_ideas')
      .insert(ideaData)
      .select('*')
      .single();

    if (error) {
      console.error(`Failed to create idea for finding ${finding.id}`, error);
      continue;
    }

    ideas.push(idea);
  }

  return ideas;
}

export async function generateGlobalImprovementSweep(): Promise<ImprovementIdea[]> {
  const modules = await listSystemModules();

  // Get underused modules (coach/simulation with low usage)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: recentMetrics } = await supabaseAdminClient
    .from('system_module_metrics')
    .select('*, system_modules(*)')
    .gte('date', sevenDaysAgoStr)
    .order('date', { ascending: false });

  const ideas: ImprovementIdea[] = [];

  for (const module of modules) {
    if (module.category !== 'coach' && module.category !== 'simulation') continue;

    const moduleMetrics = recentMetrics?.filter((m: any) => m.module_id === module.id) ?? [];
    const totalInvocations = moduleMetrics.reduce((sum, m) => sum + (m.invocation_count ?? 0), 0);

    if (totalInvocations === 0) {
      // Check if idea already exists
      const { data: existing } = await supabaseAdminClient
        .from('system_improvement_ideas')
        .select('*')
        .eq('module_id', module.id)
        .ilike('title', `%${module.name}%discoverability%`)
        .in('status', ['backlog', 'planned', 'in_experiment'])
        .maybeSingle();

      if (existing) continue;

      const { data: idea } = await supabaseAdminClient
        .from('system_improvement_ideas')
        .insert({
          source: 'ai',
          title: `Increase discoverability of ${module.name}`,
          description: `${module.name} has not been used in the last 7 days. Consider adding onboarding, UI improvements, or integration with other modules.`,
          module_id: module.id,
          capability_id: null,
          severity: 'low',
          impact_area: 'retention',
          effort_estimate: 'medium',
          status: 'backlog',
          created_by: 'ai',
        })
        .select('*')
        .single();

      if (idea) ideas.push(idea);
    }
  }

  // Get low-rated user feedback
  const { data: lowRatings } = await supabaseAdminClient
    .from('system_user_feedback')
    .select('*, system_modules(*)')
    .lte('rating', 2)
    .gte('created_at', sevenDaysAgoStr)
    .order('created_at', { ascending: false });

  if (lowRatings && lowRatings.length > 0) {
    // Group by module
    const moduleGroups = new Map<string, any[]>();
    for (const feedback of lowRatings) {
      if (!feedback.module_id) continue;
      const existing = moduleGroups.get(feedback.module_id) ?? [];
      existing.push(feedback);
      moduleGroups.set(feedback.module_id, existing);
    }

    for (const [moduleId, feedbacks] of moduleGroups.entries()) {
      const module = modules.find((m) => m.id === moduleId);
      if (!module) continue;

      const avgRating = feedbacks.reduce((sum, f) => sum + (f.rating ?? 0), 0) / feedbacks.length;

      const { data: idea } = await supabaseAdminClient
        .from('system_improvement_ideas')
        .insert({
          source: 'user',
          title: `${module.name} UX needs improvement`,
          description: `Average rating: ${avgRating.toFixed(1)}/5 from ${feedbacks.length} feedback(s). Consider UX improvements, clearer messaging, or feature refinement.`,
          module_id: moduleId,
          capability_id: null,
          severity: 'medium',
          impact_area: 'ux',
          effort_estimate: 'high',
          status: 'backlog',
          created_by: 'system',
        })
        .select('*')
        .single();

      if (idea) ideas.push(idea);
    }
  }

  return ideas;
}



// Master Brain Evolution Engine v1 - Suggestion Engine
// lib/masterbrain/evolution/suggestions.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { ImprovementIdea } from './types';
import { listSystemModules } from '../registry';

export async function prioritizeImprovementIdeas(): Promise<ImprovementIdea[]> {
  const { data: ideas } = await supabaseAdmin
    .from('system_improvement_ideas')
    .select('*, system_modules(*)')
    .in('status', ['backlog', 'planned'])
    .order('created_at', { ascending: false });

  if (!ideas || ideas.length === 0) {
    return [];
  }

  const modules = await listSystemModules();

  // Get recent usage metrics
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: recentMetrics } = await supabaseAdmin
    .from('system_module_metrics')
    .select('*, system_modules(*)')
    .gte('date', sevenDaysAgoStr);

  // Score ideas
  const scored = ideas.map((idea: any) => {
    let score = 0;

    // Severity weight
    const severityWeights: Record<string, number> = {
      high: 10,
      medium: 5,
      low: 2,
    };
    score += severityWeights[idea.severity] ?? 0;

    // Impact area weight
    const impactWeights: Record<string, number> = {
      retention: 8,
      accuracy: 7,
      performance: 6,
      reliability: 6,
      ux: 4,
      education: 3,
    };
    score += impactWeights[idea.impact_area] ?? 0;

    // Module criticality
    const module = modules.find((m) => m.id === idea.module_id);
    if (module) {
      const categoryWeights: Record<string, number> = {
        core: 5,
        coach: 3,
        simulation: 3,
        data: 2,
        integration: 2,
      };
      score += categoryWeights[module.category] ?? 0;
    }

    // Usage volume
    if (idea.module_id) {
      const moduleMetrics = recentMetrics?.filter((m: any) => m.module_id === idea.module_id) ?? [];
      const totalInvocations = moduleMetrics.reduce((sum, m) => sum + (m.invocation_count ?? 0), 0);
      score += Math.min(totalInvocations / 10, 5); // Cap at 5 points
    }

    return { idea, score };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.idea);
}

export async function getTopUpgradeSuggestions(limit: number = 10): Promise<ImprovementIdea[]> {
  const prioritized = await prioritizeImprovementIdeas();
  return prioritized.slice(0, limit);
}



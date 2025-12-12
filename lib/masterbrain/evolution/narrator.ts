// Master Brain Evolution Engine v1 - Upgrade Narrator
// lib/masterbrain/evolution/narrator.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAI } from '@/lib/ai/call';
import { getTopUpgradeSuggestions } from './suggestions';

export async function getUpgradeBriefing(): Promise<string> {
  // Get top suggestions
  const topSuggestions = await getTopUpgradeSuggestions(5);

  // Get active experiments
  const { data: activeExperiments } = await supabaseAdminClient
    .from('system_experiments')
    .select('*')
    .in('status', ['planned', 'running'])
    .order('created_at', { ascending: false })
    .limit(5);

  // Get recent changelog
  const { data: recentChangelog } = await supabaseAdminClient
    .from('system_changelog')
    .select('*, system_modules(*)')
    .order('created_at', { ascending: false })
    .limit(10);

  const suggestionsSummary = topSuggestions.map((s: any) => ({
    title: s.title,
    impact: s.impact_area,
    effort: s.effort_estimate,
    module: s.system_modules?.name,
  }));

  const experimentsSummary = activeExperiments?.map((e: any) => ({
    name: e.name,
    hypothesis: e.hypothesis,
    status: e.status,
  })) ?? [];

  const changelogSummary = recentChangelog?.map((c: any) => ({
    title: c.title,
    module: c.system_modules?.name,
    tags: c.tags,
  })) ?? [];

  const result = await callAI({
    userId: 'system',
    feature: 'upgrade_briefing',
    systemPrompt: `You are the Upgrade Narrator for Pulse's Evolution Engine. Write a friendly, concise briefing about system improvements, experiments, and recent changes.

Structure:
1. Top upgrade opportunities (2-3 sentences)
2. Experiments in progress (1-2 sentences)
3. Recent improvements shipped (1-2 sentences)

Keep it to 4-6 paragraphs total. Be specific and actionable.`,
    userPrompt: `Top Upgrade Suggestions:\n${JSON.stringify(suggestionsSummary, null, 2)}\n\nActive Experiments:\n${JSON.stringify(experimentsSummary, null, 2)}\n\nRecent Changelog:\n${JSON.stringify(changelogSummary, null, 2)}`,
    maxTokens: 1000,
    temperature: 0.7,
  });

  if (!result.success || !result.text) {
    // Fallback
    return `Pulse Evolution Engine: ${topSuggestions.length} upgrade suggestions, ${activeExperiments?.length ?? 0} active experiments, ${recentChangelog?.length ?? 0} recent changes.`;
  }

  return result.text;
}



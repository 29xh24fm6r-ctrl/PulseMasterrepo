// Third Brain Graph v4 - Civilization Narrator
// lib/thirdbrain/civilization/narrator.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { CivilizationDomainState } from '../graph/types';

export async function getCivilizationSnapshotNarrative(userId: string): Promise<string> {
  // Get latest domain states
  const { data: states } = await supabaseAdmin
    .from('civilization_domain_state')
    .select('*, civilization_domains(*)')
    .eq('civilization_domains.user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  if (!states || states.length === 0) {
    return 'Your civilization is just beginning. No domain states recorded yet.';
  }

  // Group by domain
  const domainStates = new Map<string, CivilizationDomainState & { domain_name: string }>();
  for (const state of states) {
    const domain = (state as any).civilization_domains;
    if (domain && !domainStates.has(domain.key)) {
      domainStates.set(domain.key, {
        ...state,
        domain_name: domain.name,
      });
    }
  }

  const statesArray = Array.from(domainStates.values());

  // Use LLM to generate narrative
  const { callAI } = await import('@/lib/ai/call');
  const result = await callAI({
    userId,
    feature: 'civilization_narrator',
    systemPrompt: `You are the Civilization Narrator for Pulse's Third Brain. Transform domain health scores into a vivid, mythic narrative about the user's life as a living civilization.

Map scores to metaphors:
- activity high, health high → "flourishing city"
- activity low, health low → "sleepy village needing care"
- activity high, tension high → "overcrowded, about to riot"
- activity low, tension low → "peaceful but quiet"

Write 3-5 paragraphs describing the state of each domain as a city/faction. Be poetic but actionable.`,
    userPrompt: `Domain States:\n${JSON.stringify(
      statesArray.map((s) => ({
        domain: s.domain_name,
        activity: s.activity_score,
        tension: s.tension_score,
        health: s.health_score,
        summary: s.summary,
      })),
      null,
      2
    )}`,
    maxTokens: 1000,
    temperature: 0.8,
  });

  if (!result.success || !result.content) {
    // Fallback
    return statesArray
      .map((s) => `${s.domain_name}: ${s.summary}`)
      .join('\n');
  }

  return result.content;
}


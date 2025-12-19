// Global Sense of Self Mirror v1 - Facet Engine
// lib/selfmirror/facets.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SelfMirrorFacet } from './types';

const FACET_DEFINITIONS = [
  { key: 'self_alignment', name: 'Self Alignment', description: 'How well actions match stated values and roles' },
  { key: 'work_life_balance', name: 'Work/Life Balance', description: 'Balance between professional and personal domains' },
  { key: 'relationships_nourishment', name: 'Relationships Nourishment', description: 'Attention and care given to relationships' },
  { key: 'health_attention', name: 'Health Attention', description: 'Focus on physical and mental well-being' },
  { key: 'creative_expression', name: 'Creative Expression', description: 'Time and energy for creative pursuits' },
  { key: 'financial_groundedness', name: 'Financial Groundedness', description: 'Financial planning and stability' },
];

export async function recomputeSelfMirrorFacets(userId: string): Promise<SelfMirrorFacet[]> {
  // Get latest snapshot
  const { data: latestSnapshot } = await supabaseAdmin
    .from('self_identity_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get previous snapshot for trend comparison
  const { data: previousSnapshot } = await supabaseAdmin
    .from('self_identity_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(2);

  const previous = previousSnapshot && previousSnapshot.length > 1 ? previousSnapshot[1] : null;

  // Get signals in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const { data: signals } = await supabaseAdmin
    .from('self_perception_signals')
    .select('*')
    .eq('user_id', userId)
    .gte('occurred_at', thirtyDaysAgoStr);

  // Get civilization domain states
  const { data: domainStates } = await supabaseAdmin
    .from('civilization_domain_state')
    .select('*, civilization_domains(*)')
    .eq('civilization_domains.user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  const facets: SelfMirrorFacet[] = [];

  for (const facetDef of FACET_DEFINITIONS) {
    let score: number | null = null;
    let trend: 'up' | 'down' | 'flat' | 'unknown' = 'unknown';

    // Compute score based on facet key
    if (facetDef.key === 'self_alignment') {
      score = latestSnapshot?.overall_self_alignment ? latestSnapshot.overall_self_alignment * 10 : null; // Convert 0-10 to 0-100
      if (previous && previous.overall_self_alignment !== null && score !== null) {
        const prevScore = previous.overall_self_alignment * 10;
        if (score > prevScore + 2) trend = 'up';
        else if (score < prevScore - 2) trend = 'down';
        else trend = 'flat';
      }
    } else if (facetDef.key === 'work_life_balance') {
      if (domainStates) {
        const workState = domainStates.find((s: any) => s.civilization_domains?.key === 'work');
        const familyState = domainStates.find((s: any) => s.civilization_domains?.key === 'family');
        if (workState && familyState) {
          const workActivity = workState.activity_score ?? 0;
          const familyActivity = familyState.activity_score ?? 0;
          const imbalance = Math.abs(workActivity - familyActivity);
          score = Math.max(0, 100 - imbalance); // Higher score = more balanced
        }
      }
    } else if (facetDef.key === 'relationships_nourishment') {
      if (signals) {
        const relationshipSignals = signals.filter((s) => s.category === 'relationship_nourishment');
        const supports = relationshipSignals.filter((s) => s.direction === 'supports_identity').reduce((sum, s) => sum + s.weight, 0);
        const conflicts = relationshipSignals.filter((s) => s.direction === 'conflicts_identity').reduce((sum, s) => sum + s.weight, 0);
        const total = supports + conflicts;
        if (total > 0) {
          score = (supports / total) * 100;
        }
      }
      if (domainStates) {
        const relationshipState = domainStates.find((s: any) => s.civilization_domains?.key === 'relationships');
        if (relationshipState) {
          score = relationshipState.activity_score ?? null;
        }
      }
    } else if (facetDef.key === 'health_attention') {
      if (domainStates) {
        const healthState = domainStates.find((s: any) => s.civilization_domains?.key === 'health');
        if (healthState) {
          score = healthState.activity_score ?? null;
        }
      }
    } else if (facetDef.key === 'creative_expression') {
      if (domainStates) {
        // Check if there are creative projects or sessions
        const { data: creativeProjects } = await supabaseAdmin
          .from('creative_projects')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1);

        if (creativeProjects && creativeProjects.length > 0) {
          score = 50; // Base score if active projects exist
        } else {
          score = 20; // Low score if no active projects
        }
      }
    } else if (facetDef.key === 'financial_groundedness') {
      if (signals) {
        const financeSignals = signals.filter((s) => s.source === 'finance');
        const supports = financeSignals.filter((s) => s.direction === 'supports_identity').reduce((sum, s) => sum + s.weight, 0);
        const conflicts = financeSignals.filter((s) => s.direction === 'conflicts_identity').reduce((sum, s) => sum + s.weight, 0);
        const total = supports + conflicts;
        if (total > 0) {
          score = (supports / total) * 100;
        }
      }
    }

    // Upsert facet
    const { data: facet } = await supabaseAdmin
      .from('self_mirror_facets')
      .upsert(
        {
          user_id: userId,
          key: facetDef.key,
          name: facetDef.name,
          description: facetDef.description,
          score: score !== null ? Math.round(score * 100) / 100 : null,
          trend,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,key' }
      )
      .select('*')
      .single();

    if (facet) {
      facets.push(facet);
    }
  }

  return facets;
}



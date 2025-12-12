// Mythic Coach Engine v1 - Playbook Engine
// lib/mythic/coach/playbook_engine.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { MythicContext, MythicPlaybook } from './types';

export async function selectPlaybooks(params: {
  context: MythicContext;
  situation: 'deal' | 'habit' | 'weekly_plan' | 'crisis';
}): Promise<MythicPlaybook[]> {
  const { context, situation } = params;

  // Get dominant archetypes
  const dominantArchetypeIds =
    context.mythicProfile?.dominant_life_archetypes?.map((a: any) => a.archetype_id) ?? [];

  // Get deal archetype if present
  const dealArchetypeId = context.activeDeals[0]?.archetype_run?.archetype_id;

  // Build trigger tags from context
  const triggerTags: string[] = [];
  if (context.emotionSnapshot?.stress_level && context.emotionSnapshot.stress_level > 0.7) {
    triggerTags.push('overwhelm');
  }
  if (situation === 'crisis') {
    triggerTags.push('crisis', 'stuck', 'fear');
  }
  if (situation === 'habit') {
    triggerTags.push('relapse', 'broken_streak');
  }
  if (situation === 'deal') {
    triggerTags.push('delay', 'bureaucracy');
  }

  // Query playbooks
  let query = supabaseAdminClient
    .from('mythic_playbooks')
    .select('*')
    .eq('context', situation);

  // Filter by archetype if we have dominant ones
  if (dominantArchetypeIds.length > 0) {
    query = query.or(
      `archetype_id.in.(${dominantArchetypeIds.join(',')}),archetype_id.is.null`
    );
  } else {
    query = query.is('archetype_id', null);
  }

  const { data: playbooks } = await query;

  if (!playbooks || playbooks.length === 0) {
    // Fallback: get any playbooks for this context
    const { data: fallback } = await supabaseAdminClient
      .from('mythic_playbooks')
      .select('*')
      .eq('context', situation)
      .limit(3);

    return fallback ?? [];
  }

  // Score playbooks by trigger overlap
  const scored = playbooks.map((pb: any) => {
    const pbTriggers = pb.triggers ?? [];
    const overlap = triggerTags.filter((tag) => pbTriggers.includes(tag)).length;
    return { playbook: pb, score: overlap };
  });

  // Sort by score and return top 2-3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.playbook);
}



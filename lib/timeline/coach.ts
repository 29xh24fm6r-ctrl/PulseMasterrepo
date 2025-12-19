// Timeline Coach v1 - Coach Engine
// lib/timeline/coach.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { TimelineCoachSession, TimelineCoachMode } from '../destiny/types';
import { getCurrentDestinyAnchor } from '../destiny/anchor';

export async function runTimelineCoachSession(params: {
  userId: string;
  mode: TimelineCoachMode;
  question?: string;
  timelineIds?: string[];
}): Promise<TimelineCoachSession> {
  const { userId, mode, question, timelineIds } = params;

  // 1. Load active timelines
  const { data: allTimelines } = await supabaseAdmin
    .from('destiny_timelines')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (!allTimelines || allTimelines.length === 0) {
    throw new Error('No active timelines found');
  }

  // 2. Select timelines
  let selectedTimelineIds: string[] = timelineIds ?? [];

  if (selectedTimelineIds.length === 0) {
    // Get latest scores for all timelines
    const timelineScores = new Map<string, any>();
    for (const timeline of allTimelines) {
      const { data: latestScore } = await supabaseAdmin
        .from('destiny_timeline_scores')
        .select('*')
        .eq('timeline_id', timeline.id)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestScore) {
        timelineScores.set(timeline.id, latestScore);
      }
    }

    // Select 2-4 most relevant (high feasibility OR high tension OR anchored)
    const currentAnchor = await getCurrentDestinyAnchor(userId);
    const anchorId = currentAnchor?.id;

    const scored = allTimelines.map((t) => {
      const score = timelineScores.get(t.id);
      const feasibility = score?.feasibility_score ?? 0;
      const risk = score?.risk_score ?? 0;
      const isAnchored = t.id === anchorId;
      const relevance = (feasibility * 2) + (risk * 1.5) + (isAnchored ? 10 : 0);
      return { timeline: t, relevance, score };
    });

    scored.sort((a, b) => b.relevance - a.relevance);
    selectedTimelineIds = scored.slice(0, Math.min(4, scored.length)).map((s) => s.timeline.id);
  }

  const selectedTimelines = allTimelines.filter((t) => selectedTimelineIds.includes(t.id));

  // 3. Get latest scores for selected timelines
  const timelineData: any[] = [];
  for (const timeline of selectedTimelines) {
    const { data: latestScore } = await supabaseAdmin
      .from('destiny_timeline_scores')
      .select('*')
      .eq('timeline_id', timeline.id)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: waypoints } = await supabaseAdmin
      .from('destiny_waypoints')
      .select('*')
      .eq('timeline_id', timeline.id)
      .order('ordering', { ascending: true });

    timelineData.push({
      timeline,
      score: latestScore,
      waypoints: waypoints ?? [],
    });
  }

  // 4. Get Self Mirror context
  const { data: latestSnapshot } = await supabaseAdmin
    .from('self_identity_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: facets } = await supabaseAdmin
    .from('self_mirror_facets')
    .select('*')
    .eq('user_id', userId);

  // 5. Get Mythic profile
  const { data: mythicProfile } = await supabaseAdmin
    .from('user_mythic_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // 6. Get Civilization domain states
  const { data: domainStates } = await supabaseAdmin
    .from('civilization_domain_state')
    .select('*, civilization_domains(*)')
    .eq('civilization_domains.user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  // 7. Build LLM prompt
  const timelinesContext = timelineData
    .map((td) => {
      const t = td.timeline;
      const s = td.score;
      return `Timeline: ${t.name}
Description: ${t.description ?? 'N/A'}
Horizon: ${t.time_horizon_years} years
Domains: ${t.primary_domains.join(', ')}
Scores: Feasibility ${s?.feasibility_score ?? 'N/A'}/10, Alignment ${s?.alignment_score ?? 'N/A'}/10, Risk ${s?.risk_score ?? 'N/A'}/10, Emotional Fit ${s?.emotional_fit_score ?? 'N/A'}/10
Narrative: ${s?.narrative_summary ?? 'N/A'}
Waypoints: ${td.waypoints.map((w: any) => w.name).join(', ')}`;
    })
    .join('\n\n');

  const contextPrompt = `User Context:
- Roles: ${JSON.stringify(latestSnapshot?.roles ?? [])}
- Values: ${JSON.stringify(latestSnapshot?.values ?? [])}
- Overall Alignment: ${latestSnapshot?.overall_self_alignment ?? 'N/A'}/10
- Facets: ${facets?.map((f) => `${f.name}: ${f.score ?? 'N/A'}/100`).join(', ') ?? 'None'}
- Mythic Chapter: ${mythicProfile?.current_chapter ?? 'N/A'}
- Archetypes: ${JSON.stringify(mythicProfile?.dominant_archetypes ?? [])}
- Civilization: ${domainStates?.map((s: any) => `${s.civilization_domains?.name}: ${s.activity_score}/100 activity`).join(', ') ?? 'None'}

Timelines:
${timelinesContext}

Mode: ${mode}
Question: ${question ?? 'Help me understand these paths'}`;

  // 8. Generate coach response
  const modePrompts: Record<TimelineCoachMode, string> = {
    compare_paths: 'Compare these timelines. Provide pros/cons for each, where each is strongest/weakest, and which appears best for this user and why.',
    refine_path: 'Suggest refinements to tweak waypoints or horizons for 1-2 of these timelines to improve feasibility or alignment.',
    next_steps: 'Provide 3-7 concrete actions for the anchored or favored timeline, tagged by domain (work, family, money, etc.).',
    crisis_repath: 'Provide gentle reframing and alternative micro-timeline(s) for the next 3-12 months given current challenges.',
  };

  const result = await callAIJson<{
    response: string;
    summary: string;
    recommendations: Array<{ timeline_id: string; kind: string; action: string; rationale?: string }>;
    followup_actions: Array<{ text: string; domain?: string; priority?: string }>;
  }>({
    userId,
    feature: 'timeline_coach',
    systemPrompt: `You are the Timeline Coach, a wise guide for navigating future paths. ${modePrompts[mode]}`,
    userPrompt: contextPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error('Failed to generate coach response');
  }

  const { response, summary, recommendations, followup_actions } = result.data;

  // 9. Save session
  const { data: session, error } = await supabaseAdmin
    .from('timeline_coach_sessions')
    .insert({
      user_id: userId,
      mode,
      completed_at: new Date().toISOString(),
      selected_timeline_ids: selectedTimelineIds,
      question: question ?? null,
      response,
      summary,
      recommendations: recommendations ?? [],
      followup_actions: followup_actions ?? [],
    })
    .select('*')
    .single();

  if (error) throw error;
  return session;
}



// Global Sense of Self Mirror v1 - Mirror Session Engine
// lib/selfmirror/sessions.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { SelfMirrorSession, SelfMirrorMode } from './types';
import { buildSelfIdentitySnapshot } from './snapshots';
import { recomputeSelfMirrorFacets } from './facets';

export async function startSelfMirrorSession(params: {
  userId: string;
  mode: SelfMirrorMode;
}): Promise<SelfMirrorSession> {
  const { userId, mode } = params;

  // 1. Ensure latest snapshot & facets
  const { data: latestSnapshot } = await supabaseAdminClient
    .from('self_identity_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  let snapshot = latestSnapshot;
  if (!snapshot || new Date(snapshot.taken_at) < oneDayAgo) {
    snapshot = await buildSelfIdentitySnapshot(userId, 'mirror_session');
  }

  const facets = await recomputeSelfMirrorFacets(userId);

  // 2. Get Emotion OS patterns
  const { data: emotionStates } = await supabaseAdminClient
    .from('emotion_state_daily')
    .select('date, stress_score, resilience_score')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7);

  // 3. Get Civilization summary
  const { data: domainStates } = await supabaseAdminClient
    .from('civilization_domain_state')
    .select('*, civilization_domains(*)')
    .eq('civilization_domains.user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  // 4. Build LLM prompt
  const contextPrompt = `Self Identity Snapshot:
- Roles: ${JSON.stringify(snapshot.roles)}
- Values: ${JSON.stringify(snapshot.values)}
- Strengths: ${JSON.stringify(snapshot.strengths)}
- Vulnerabilities: ${JSON.stringify(snapshot.vulnerabilities)}
- Self Story: ${snapshot.self_story ?? 'Not available'}
- Overall Alignment: ${snapshot.overall_self_alignment?.toFixed(1)}/10

Facets:
${facets.map((f) => `- ${f.name}: ${f.score ?? 'N/A'}/100 (trend: ${f.trend})`).join('\n')}

Recent Emotion Patterns:
${emotionStates?.map((e) => `- ${e.date}: stress ${e.stress_score}/10, resilience ${e.resilience_score}/10`).join('\n') ?? 'No recent data'}

Civilization Domains:
${domainStates?.map((s: any) => `- ${s.civilization_domains?.name}: activity ${s.activity_score}/100, health ${s.health_score}/100`).join('\n') ?? 'No recent data'}`;

  // 5. Generate mirror session content
  const modePrompts: Record<SelfMirrorMode, string> = {
    daily_glance: 'Generate a brief, gentle daily reflection (2-3 paragraphs) with 2-3 quick reflection questions and 1-2 micro-adjustments.',
    weekly_debrief: 'Generate a thoughtful weekly reflection (3-4 paragraphs) with 3-5 deeper reflection questions and 2-3 suggested actions for the week ahead.',
    identity_deep_dive: 'Generate a deep identity exploration (4-5 paragraphs) with 5-7 profound reflection questions and 3-4 significant adjustments or commitments.',
    crucible_review: 'Generate a compassionate but honest review during a difficult time (3-4 paragraphs) with 3-4 supportive questions and 2-3 restorative actions.',
  };

  const result = await callAIJson<{
    summary: string;
    insights: Array<{ key: string; value: string }>;
    reflection_questions: string[];
    micro_adjustments: string[];
  }>({
    userId,
    feature: 'self_mirror_session',
    systemPrompt: `You are a compassionate, insightful mirror for self-reflection. Generate a ${mode} session that helps the user see themselves clearly and make gentle adjustments. Be kind but honest.`,
    userPrompt: `${modePrompts[mode]}\n\nContext:\n${contextPrompt}`,
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error('Failed to generate mirror session');
  }

  const { summary, insights, reflection_questions, micro_adjustments } = result.data;

  // 6. Save session
  const { data: session, error } = await supabaseAdminClient
    .from('self_mirror_sessions')
    .insert({
      user_id: userId,
      mode,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      snapshot_id: snapshot.id,
      summary,
      insights: insights ?? [],
      followup_actions: micro_adjustments.map((action) => ({ text: action, type: 'micro_adjustment' })),
    })
    .select('*')
    .single();

  if (error) throw error;
  return session;
}



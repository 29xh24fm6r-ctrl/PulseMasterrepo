// Executive Council Mode v1 - Orchestrator
// lib/executive_council/v1/orchestrator.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { buildCouncilDecisionContext } from './context';
import { ensureCouncilMembersForUser } from './members';
import { COUNCIL_MEMBER_PROMPT, COUNCIL_SYNTHESIZER_PROMPT } from './prompts';
import { CouncilOpinion, CouncilRoleId, CouncilConsensus } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function startCouncilSession(
  userId: string,
  now: Date,
  params: {
    topic: string;
    question: string;
    timescale?: string;
    importance?: number;
    rawContext?: any;
    triggerSource?: string;
  }
) {
  const dbUserId = await resolveUserId(userId);
  const ctx = await buildCouncilDecisionContext(userId, now, params);
  const members = await ensureCouncilMembersForUser(userId);

  const { data: snapshot } = await supabaseAdmin
    .from('strategic_state_snapshots')
    .select('id')
    .eq('user_id', dbUserId)
    .order('snapshot_time', { ascending: false })
    .limit(1);

  const { data: equilibrium } = await supabaseAdmin
    .from('strategic_equilibria')
    .select('id')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false })
    .limit(1);

  const { data: sessionRows, error: sessionError } = await supabaseAdmin
    .from('council_sessions')
    .insert({
      user_id: dbUserId,
      topic: params.topic,
      question: params.question,
      timescale: params.timescale ?? null,
      importance: params.importance ?? 0.6,
      context: params.rawContext ?? {},
      trigger_source: params.triggerSource ?? 'user_request',
      snapshot_id: snapshot?.[0]?.id ?? null,
      equilibrium_id: equilibrium?.[0]?.id ?? null,
    })
    .select('id');

  if (sessionError) throw sessionError;
  const sessionId = sessionRows?.[0]?.id as string;

  // Collect opinions from each enabled member
  const opinions: CouncilOpinion[] = [];

  for (const m of members.filter((m: any) => m.enabled)) {
    try {
      const result = await callAIJson<{ opinion: CouncilOpinion }>({
        userId,
        feature: 'council_member_opinion',
        systemPrompt: COUNCIL_MEMBER_PROMPT.replace('{{role}}', m.display_name),
        userPrompt: JSON.stringify({
          roleId: m.role_id,
          member: m,
          context: ctx,
        }, null, 2),
        maxTokens: 2000,
        temperature: 0.7,
      });

      if (!result.success || !result.data) {
        console.error(`[Council] Failed to get opinion from ${m.role_id}`, result.error);
        continue;
      }

      const opinion = result.data.opinion;
      if (!opinion) continue;

      const fullOpinion: CouncilOpinion = {
        ...opinion,
        memberRoleId: m.role_id as CouncilRoleId,
      };

      opinions.push(fullOpinion);

      await supabaseAdmin
        .from('council_opinions')
        .insert({
          session_id: sessionId,
          user_id: dbUserId,
          member_role_id: m.role_id,
          stance: opinion.stance,
          recommendation: opinion.recommendation,
          rationale: opinion.rationale ?? {},
          confidence: opinion.confidence ?? 0.5,
          suggested_conditions: opinion.suggestedConditions ?? [],
          raw_payload: opinion,
        });
    } catch (err) {
      console.error(`[Council] Error getting opinion from ${m.role_id}`, err);
      // Continue with next member
    }
  }

  if (!opinions.length) {
    throw new Error('No council opinions collected');
  }

  // Synthesize consensus
  const result = await callAIJson<{
    consensus: CouncilConsensus;
  }>({
    userId,
    feature: 'council_consensus',
    systemPrompt: COUNCIL_SYNTHESIZER_PROMPT,
    userPrompt: JSON.stringify({
      context: ctx,
      opinions,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to synthesize consensus: ${result.error}`);
  }

  const { consensus } = result.data;

  const { data: consensusRows, error: consensusError } = await supabaseAdmin
    .from('council_consensus')
    .insert({
      session_id: sessionId,
      user_id: dbUserId,
      consensus_recommendation: consensus.consensusRecommendation,
      summary: consensus.summary ?? {},
      voting_breakdown: consensus.votingBreakdown ?? {},
      overall_confidence: consensus.overallConfidence ?? 0.6,
      risk_profile: consensus.riskProfile ?? {},
    })
    .select('id');

  if (consensusError) throw consensusError;

  const consensusId = consensusRows?.[0]?.id as string;

  await supabaseAdmin
    .from('council_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return {
    sessionId,
    consensusId,
    context: ctx,
    opinions,
    consensus,
  };
}



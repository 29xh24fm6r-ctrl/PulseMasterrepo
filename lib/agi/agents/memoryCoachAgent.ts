// Memory Coach Agent v3
// lib/agi/agents/memoryCoachAgent.ts

import { Agent, makeAgentResult } from '../agents';
import { AgentContext, AGIAction } from '../types';
import { findSimilarEmotionEpisodes, findPastEventsWithTag } from '@/lib/thirdbrain/graph/query';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export const memoryCoachAgent: Agent = {
  name: 'MemoryCoachAgent',
  description: 'Uses memory graph and chapters to provide insights about patterns, similar past events, and life themes.',
  domains: ['identity', 'relationships', 'work'],
  priority: 80,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const world: any = ctx.world;
    const memoryGraph = world.memoryGraph;

    if (!memoryGraph) {
      return makeAgentResult(
        'MemoryCoachAgent',
        'No memory graph data available.',
        [],
        0.1,
      );
    }

    // Check for high stress and find similar past episodes
    const currentStress = world.emotion?.intensity || 0;
    if (currentStress > 0.7) {
      // Find similar past emotion episodes
      const { data: emotionNodes } = await supabaseAdmin
        .from('tb_nodes')
        .select('id')
        .eq('user_id', await resolveUserId(ctx.userId))
        .eq('type', 'emotion_state')
        .gt('props->>stress', '0.7')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (emotionNodes) {
        const similar = await findSimilarEmotionEpisodes(ctx.userId, emotionNodes.id, 3);
        if (similar.length > 0) {
          actions.push({
            type: 'log_insight',
            label: 'You\'ve felt this way before',
            details: {
              message: `You've had ${similar.length} similar high-stress episodes in the past. What helped then might help now.`,
              domain: 'memory',
              subsource: 'memory_coach_agent',
            },
            requiresConfirmation: false,
            riskLevel: 'low',
          });
        }
      }
    }

    // Use current chapter for context
    if (memoryGraph.currentChapter) {
      actions.push({
        type: 'nudge_user',
        label: `Current life chapter: ${memoryGraph.currentChapter.title}`,
        details: {
          message: `You're in a period defined by: ${memoryGraph.currentChapter.tags?.join(', ') || 'various themes'}. This context might help you make decisions.`,
          domain: 'memory',
          subsource: 'memory_coach_agent',
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    // Check for civilization patterns that might help
    const { data: patterns } = await supabaseAdmin
      .from('civilization_patterns')
      .select('*')
      .in('domain', ['focus', 'communication', 'finance'])
      .limit(3);

    if (patterns && patterns.length > 0 && currentStress > 0.6) {
      const relevantPattern = patterns[0];
      actions.push({
        type: 'nudge_user',
        label: `Pattern from Pulse Nation: ${relevantPattern.title}`,
        details: {
          message: relevantPattern.description_md.slice(0, 200),
          domain: 'memory',
          subsource: 'memory_coach_agent',
          metadata: {
            patternKey: relevantPattern.key,
          },
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    const reasoning = `Analyzed memory graph. Found ${memoryGraph.keyPeople?.length || 0} key people, ${memoryGraph.keyProjects?.length || 0} projects, and current chapter context.`;

    return makeAgentResult('MemoryCoachAgent', reasoning, actions, 0.7);
  },
};



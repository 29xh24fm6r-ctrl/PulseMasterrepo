// Workspace v2 Context Builder
// lib/workspace/v2/context.ts

import { buildExperienceContext } from '@/lib/wisdom/context';
import { getWisdomForContext } from '@/lib/wisdom/middleware';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

async function getRecentAlignmentSignalsForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('alignment_evaluations')
    .select('*')
    .eq('user_id', dbUserId)
    .order('evaluated_at', { ascending: false })
    .limit(10);

  return {
    recentEvaluations: data || [],
    highRiskCount: (data || []).filter((e: any) => e.ethical_risk > 0.6).length,
    lowAlignmentCount: (data || []).filter((e: any) => e.value_alignment < 0.4).length,
  };
}

async function getSocialGraphSummaryForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: insights } = await supabaseAdmin
    .from('social_insights')
    .select('*')
    .eq('user_id', dbUserId)
    .order('generated_at', { ascending: false })
    .limit(1);

  return insights?.[0] ?? null;
}

export async function buildWorkspaceContext(userId: string, date: Date) {
  // Reuse general experience context
  const baseContext = await buildExperienceContext(userId, date);

  const ethics = await getRecentAlignmentSignalsForUser(userId);
  const wisdom = await getWisdomForContext(userId, baseContext);
  const social = await getSocialGraphSummaryForUser(userId);

  return {
    ...baseContext,
    ethics,
    wisdom,
    social: social ? {
      topRelationships: social.top_relationships || [],
      driftWarnings: social.drift_warnings || [],
      tensionHotspots: social.tension_hotspots || [],
    } : null,
  };
}



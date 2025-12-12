// Experience Context Builder
// lib/wisdom/context.ts

import { supabaseAdmin } from '@/lib/supabase';
import { getEmotionSnapshotForUser } from '@/lib/emotion/engine';
import { getSomaticSnapshotForUser } from '@/lib/somatic/engine';
import { getCurrentNarrativeContextForUser } from '@/lib/narrative/context';
import { ExperienceContext } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

async function getWorkspaceStateForUser(userId: string, date: Date): Promise<any> {
  const dbUserId = await resolveUserId(userId);
  const dateStr = date.toISOString().slice(0, 10);

  const { data } = await supabaseAdmin
    .from('workspace_state')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('state_date', dateStr)
    .limit(1);

  return data?.[0] ?? null;
}

async function getSocialGraphSummaryForUser(userId: string): Promise<any> {
  // Get a summary of social graph state
  const dbUserId = await resolveUserId(userId);

  const { data: insights } = await supabaseAdmin
    .from('social_insights')
    .select('*')
    .eq('user_id', dbUserId)
    .order('generated_at', { ascending: false })
    .limit(1);

  return insights?.[0] ?? null;
}

async function getIdentityProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: profile } = await supabaseAdmin
    .from('value_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  return profile?.[0] ?? null;
}

export async function buildExperienceContext(userId: string, when: Date): Promise<ExperienceContext> {
  const [emotion, somatic, narrative, workspace, social, identity] = await Promise.all([
    getEmotionSnapshotForUser(userId, when).catch(() => null),
    getSomaticSnapshotForUser(userId, when).catch(() => null),
    getCurrentNarrativeContextForUser(userId).catch(() => null),
    getWorkspaceStateForUser(userId, when).catch(() => null),
    getSocialGraphSummaryForUser(userId).catch(() => null),
    getIdentityProfileForUser(userId).catch(() => null),
  ]);

  return {
    emotion,
    somatic,
    narrative: narrative ? {
      chapter: narrative.chapter?.title,
      tensions: narrative.snapshot?.tensions || [],
    } : null,
    workspace: workspace ? {
      focusMode: workspace.focus_mode,
      focusTheme: workspace.focus_theme,
      attentionLoad: workspace.attention_load,
    } : null,
    social: social ? {
      topRelationships: social.top_relationships || [],
      driftWarnings: social.drift_warnings || [],
      tensionHotspots: social.tension_hotspots || [],
    } : null,
    identity: identity ? {
      coreValues: identity.core_values || [],
      rolePriorities: identity.role_priorities || {},
    } : null,
  };
}


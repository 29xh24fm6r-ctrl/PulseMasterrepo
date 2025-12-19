// Global Sense of Self Mirror v1 - Snapshot Engine
// lib/selfmirror/snapshots.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAI } from '@/lib/ai/call';
import { SelfIdentitySnapshot, SnapshotSource } from './types';
import { ingestSignalsFromSystems } from './signals';

export async function buildSelfIdentitySnapshot(
  userId: string,
  source: SnapshotSource = 'system'
): Promise<SelfIdentitySnapshot> {
  // 1. Ingest latest signals
  await ingestSignalsFromSystems(userId);

  // 2. Load Identity Engine data
  const { data: identityProfile } = await supabaseAdmin
    .from('identity_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const roles = identityProfile?.roles ?? [];
  const values = identityProfile?.core_values ?? [];
  const strengths = identityProfile?.strengths ?? [];
  const vulnerabilities = identityProfile?.vulnerabilities ?? [];

  // 3. Load Mythic data
  const { data: mythicProfile } = await supabaseAdmin
    .from('user_mythic_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const archetypes = mythicProfile?.dominant_archetypes ?? [];

  // 4. Load latest Civilization domain state
  const { data: domainStates } = await supabaseAdmin
    .from('civilization_domain_state')
    .select('*, civilization_domains(*)')
    .eq('civilization_domains.user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  const domainBalance: any = {};
  if (domainStates) {
    for (const state of domainStates) {
      const domain = (state as any).civilization_domains;
      if (domain) {
        domainBalance[domain.key] = {
          activity: state.activity_score,
          health: state.health_score,
          tension: state.tension_score,
        };
      }
    }
  }

  // 5. Aggregate perception signals (last 14-30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const { data: signals } = await supabaseAdmin
    .from('self_perception_signals')
    .select('*')
    .eq('user_id', userId)
    .gte('occurred_at', thirtyDaysAgoStr);

  let supportsCount = 0;
  let conflictsCount = 0;
  let totalWeight = 0;

  if (signals) {
    for (const signal of signals) {
      totalWeight += signal.weight;
      if (signal.direction === 'supports_identity') {
        supportsCount += signal.weight;
      } else if (signal.direction === 'conflicts_identity') {
        conflictsCount += signal.weight;
      }
    }
  }

  // Compute overall_self_alignment (0-10 scale)
  let overallAlignment = 5.0; // neutral
  if (totalWeight > 0) {
    const supportRatio = supportsCount / totalWeight;
    overallAlignment = supportRatio * 10; // 0-10 scale
  }

  // 6. Use LLM to generate self_story
  const storyPrompt = `Generate a 2-3 paragraph narrative summary of this person's current identity state.

Roles: ${JSON.stringify(roles)}
Values: ${JSON.stringify(values)}
Strengths: ${JSON.stringify(strengths)}
Vulnerabilities: ${JSON.stringify(vulnerabilities)}
Mythic Archetypes: ${JSON.stringify(archetypes)}
Domain Balance: ${JSON.stringify(domainBalance)}
Overall Alignment: ${overallAlignment.toFixed(1)}/10

Write a compassionate, insightful summary that captures who they are and how they're living.`;

  const storyResult = await callAI({
    userId,
    feature: 'self_mirror_story',
    systemPrompt: 'You are a compassionate identity narrator. Write a brief, insightful summary of a person\'s current self-state.',
    userPrompt: storyPrompt,
    maxTokens: 500,
    temperature: 0.7,
  });

  const selfStory = storyResult.success && storyResult.content ? storyResult.content : null;

  // 7. Save snapshot
  const { data: snapshot, error } = await supabaseAdmin
    .from('self_identity_snapshots')
    .insert({
      user_id: userId,
      taken_at: new Date().toISOString(),
      source,
      roles: roles.length > 0 ? roles : null,
      values: values.length > 0 ? values : null,
      strengths: strengths.length > 0 ? strengths : null,
      vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : null,
      self_story: selfStory,
      mythic_archetypes: archetypes.length > 0 ? archetypes : null,
      domain_balance: Object.keys(domainBalance).length > 0 ? domainBalance : null,
      overall_self_alignment: Math.round(overallAlignment * 100) / 100,
    })
    .select('*')
    .single();

  if (error) throw error;
  return snapshot;
}



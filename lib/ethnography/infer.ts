// Ethnographic Intelligence - Cultural Inference Engine
// lib/ethnography/infer.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CulturalDomain, CulturalProfile } from './types';
import { CULTURAL_INFERENCE_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function inferCulturalProfileForDomain(
  userId: string,
  domain: CulturalDomain,
  now: Date
) {
  const dbUserId = await resolveUserId(userId);

  // Get signals from last 30 days
  const since = new Date(now.getTime() - 30 * 86400000).toISOString();

  const { data: signals } = await supabaseAdmin
    .from('cultural_signals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('domain', domain)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (!signals || signals.length === 0) {
    console.warn(`[Ethnography] No signals found for domain ${domain}`);
    return null;
  }

  // Get existing profile for context
  const { data: existingProfile } = await supabaseAdmin
    .from('cultural_profiles')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('domain', domain)
    .limit(1);

  const result = await callAIJson<{
    profile: CulturalProfile;
    confidence: number;
    evidence: Array<{ signalId: string; reason: string }>;
  }>({
    userId,
    feature: 'ethnography_inference',
    systemPrompt: CULTURAL_INFERENCE_PROMPT,
    userPrompt: JSON.stringify({
      domain,
      signals: signals ?? [],
      existingProfile: existingProfile?.[0] ?? null,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Ethnography] Failed to infer cultural profile', result.error);
    return null;
  }

  const { profile, confidence, evidence } = result.data;

  // Upsert cultural profile
  const profileData = {
    user_id: dbUserId,
    domain,
    norms: profile.norms ?? {},
    risk_tolerance: profile.riskTolerance ?? {},
    communication_style: profile.communicationStyle ?? {},
    approval_dynamics: profile.approvalDynamics ?? {},
    decision_patterns: profile.decisionPatterns ?? {},
    cultural_rules: profile.culturalRules ?? {},
    cultural_red_flags: profile.culturalRedFlags ?? {},
    cultural_opportunities: profile.culturalOpportunities ?? {},
    updated_at: now.toISOString(),
  };

  if (existingProfile?.[0]) {
    await supabaseAdmin
      .from('cultural_profiles')
      .update(profileData)
      .eq('id', existingProfile[0].id);
  } else {
    await supabaseAdmin
      .from('cultural_profiles')
      .insert({
        ...profileData,
        created_at: now.toISOString(),
      });
  }

  // Create inference snapshot
  await supabaseAdmin
    .from('cultural_inference_snapshots')
    .insert({
      user_id: dbUserId,
      domain,
      snapshot_time: now.toISOString(),
      inferred_profile: profile,
      confidence: confidence ?? 0.7,
      evidence: evidence ?? [],
    });

  return { profile, confidence, evidence };
}

export async function refreshCulturalProfilesForUser(userId: string, now: Date) {
  const domains: CulturalDomain[] = ['institution', 'industry', 'team', 'leader', 'relationship'];

  for (const domain of domains) {
    try {
      await inferCulturalProfileForDomain(userId, domain, now);
      // Small delay to avoid overwhelming the LLM
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[Ethnography] Failed to infer profile for domain ${domain}`, err);
      // Continue with next domain
    }
  }
}



// Culture Profile Inference
// lib/culture/profiles.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CultureProfile } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const CULTURE_PROFILE_PROMPT = `
You are the Ethnographic Intelligence Engine.

You see:
- A context (organization, family, team, industry, etc.).
- Observed norm logs: how people actually behave and react.

Your job:
1. Infer norms: punctuality, hierarchy, risk tolerance, conflict style, etc.
2. Describe communicationStyle: tone, formality, acceptable humor, email/meeting customs.
3. Identify successMarkers: what people here reward.
4. Identify tabooBehaviors: what is frowned upon or dangerous to do.
5. Note politicalSensitivities: topics or alignments to handle carefully.
6. Map languagePatterns: jargon or key phrases that "belong" to this culture.
7. Describe decisionMakingStyle and hiddenRules (unwritten).

Return JSON: { "profile": { ... } }.

Only return valid JSON.`;

export async function refreshCultureProfileForContext(userId: string, contextKey: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: ctxRows, error: ctxError } = await supabaseAdmin
    .from('culture_contexts')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('key', contextKey)
    .limit(1);

  if (ctxError) {
    console.error('[Culture] Failed to fetch context', ctxError);
    throw ctxError;
  }

  const ctx = ctxRows?.[0];
  if (!ctx) {
    console.warn('[Culture] Context not found', contextKey);
    return;
  }

  const { data: normLogs, error: normError } = await supabaseAdmin
    .from('culture_norm_logs')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('context_id', ctx.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (normError) {
    console.error('[Culture] Failed to fetch norm logs', normError);
    throw normError;
  }

  const result = await callAIJson<{ profile: CultureProfile }>({
    userId,
    feature: 'culture_profile',
    systemPrompt: CULTURE_PROFILE_PROMPT,
    userPrompt: JSON.stringify({
      context: {
        key: ctx.key,
        name: ctx.name,
        kind: ctx.kind,
        description: ctx.description,
      },
      normLogs: (normLogs || []).slice(0, 100).map((n: any) => ({
        source: n.source,
        summary: n.summary,
        tags: n.tags || [],
        weight: n.weight,
      })),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Culture] Failed to generate profile', result.error);
    return;
  }

  const { profile } = result.data;

  const { error } = await supabaseAdmin
    .from('culture_profiles')
    .upsert(
      {
        user_id: dbUserId,
        context_id: ctx.id,
        norms: profile.norms ?? {},
        communication_style: profile.communicationStyle ?? {},
        success_markers: profile.successMarkers ?? {},
        taboo_behaviors: profile.tabooBehaviors ?? {},
        political_sensitivities: profile.politicalSensitivities ?? {},
        language_patterns: profile.languagePatterns ?? {},
        decision_making_style: profile.decisionMakingStyle ?? {},
        hidden_rules: profile.hiddenRules ?? {},
        summary: profile.summary ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,context_id' }
    );

  if (error) {
    console.error('[Culture] Failed to upsert profile', error);
    throw error;
  }
}



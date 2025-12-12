// Culture Alignment Evaluation
// lib/culture/alignment.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const CULTURE_ALIGNMENT_PROMPT = `
You are the Culture Alignment Evaluator.

You see:
- A culture context (e.g., the user's bank or team).
- A culture profile (norms, communication style, taboos).
- Recent experience events for this context (wins, conflicts, feedback, etc.).

Your job:
1. Rate alignmentOverall (0..1) of the user's current behavior with this culture.
2. Identify strengths: ways they naturally fit or excel in this environment.
3. Identify frictionPoints: recurring clashes or misunderstandings.
4. Identify riskAreas: where misalignment might harm their goals (eg. promotions, trust).
5. Suggest practical small changes or strategies to navigate this culture while staying true to their values.

Return JSON: { "snapshot": { ... } }.

Only return valid JSON.`;

export async function evaluateCultureAlignmentForContext(
  userId: string,
  contextKey: string,
  date: Date
) {
  const day = date.toISOString().slice(0, 10);
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

  const [{ data: profileRows }, { data: recentEvents }] = await Promise.all([
    supabaseAdmin
      .from('culture_profiles')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('context_id', ctx.id)
      .limit(1),
    supabaseAdmin
      .from('experience_events')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('occurred_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('occurred_at', { ascending: false })
      .limit(50),
  ]);

  const profile = profileRows?.[0] ?? null;

  const result = await callAIJson<{
    snapshot: {
      alignmentOverall: number;
      strengths: any;
      frictionPoints: any;
      riskAreas: any;
      suggestions: any;
    };
  }>({
    userId,
    feature: 'culture_alignment',
    systemPrompt: CULTURE_ALIGNMENT_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      context: {
        key: ctx.key,
        name: ctx.name,
        kind: ctx.kind,
      },
      profile: profile ? {
        norms: profile.norms,
        communicationStyle: profile.communication_style,
        successMarkers: profile.success_markers,
        tabooBehaviors: profile.taboo_behaviors,
        hiddenRules: profile.hidden_rules,
      } : null,
      recentEvents: (recentEvents || []).slice(0, 30).map((e: any) => ({
        source: e.source,
        kind: e.kind,
        description: e.description,
        evaluation: e.evaluation || {},
      })),
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Culture] Failed to generate alignment snapshot', result.error);
    return;
  }

  const { snapshot } = result.data;

  const { error } = await supabaseAdmin
    .from('culture_alignment_log')
    .insert({
      user_id: dbUserId,
      context_id: ctx.id,
      alignment_overall: snapshot.alignmentOverall,
      strengths: snapshot.strengths ?? {},
      friction_points: snapshot.frictionPoints ?? {},
      risk_areas: snapshot.riskAreas ?? {},
      suggestions: snapshot.suggestions ?? {},
    });

  if (error) {
    console.error('[Culture] Failed to insert alignment log', error);
    throw error;
  }
}



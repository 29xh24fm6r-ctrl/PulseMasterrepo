// Alignment Evaluator
// lib/ethics/evaluator.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { getApplicablePolicies } from './policies';
import { ValueProfile, AlignmentEvaluationInput, AlignmentEvaluationResult } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const ALIGNMENT_EVALUATION_SYSTEM_PROMPT = `
You are the Ethical Compass for a life OS.

You receive:
- A description of a proposed action/plan/message.
- Structured actionPayload describing what will actually happen.
- A set of active policies:
  - Some are system-wide (e.g., no sexual content, no manipulation, no harm).
  - Some are user-specific.
- The user's valueProfile: core values, red lines, roles, aspirations.

Your job:
1. Check for violations of system-level policies.
   - If any are clearly violated, this should strongly increase ethicalRisk.
2. Check consistency with the user's core values, roles, and red lines.
   - Does this move them toward or away from who they say they want to be?
3. Identify:
   - redFlags: specific concerns with severity and explanation.
   - approvals: positive alignment points (e.g., supports family, integrity, long-term goals).
4. Compute:
   - ethicalRisk (0=clean, 1=very problematic).
   - valueAlignment (0=opposed, 1=strongly aligned).
5. Choose a finalRecommendation:
   - 'allow': safe and aligned.
   - 'allow_with_changes': small tweaks needed.
   - 'block': violates critical policies or red lines.
   - 'escalate_to_user': ambiguous but sensitive; user must explicitly confirm.
6. If 'allow_with_changes' or 'block', propose a recommendedAdjustment:
   - e.g., change tone, narrow scope, remove manipulative element, shift timing, choose a different approach.
   - Always phrase adjustments in pro-social, value-respecting terms.

You must NOT:
- Suggest deceptive, coercive, or manipulative strategies.
- Encourage illegal or harmful behavior.
- Override the user's values for short-term convenience.

Return JSON: { "evaluation": { ... } }.

Only return valid JSON.`;

async function getValueProfile(userId: string): Promise<ValueProfile | null> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('value_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  if (error) {
    console.error('[Ethics] Failed to fetch value profile', error);
    return null;
  }

  const row = data?.[0];
  if (!row) return null;

  return {
    userId,
    summary: row.summary ?? undefined,
    coreValues: row.core_values ?? [],
    rolePriorities: row.role_priorities ?? {},
    redLines: row.red_lines ?? [],
    aspirationStatement: row.aspiration_statement ?? undefined,
  };
}

export async function evaluateAlignment(
  input: AlignmentEvaluationInput
): Promise<AlignmentEvaluationResult> {
  const { userId, source, contextType, contextId, description, actionPayload } = input;
  const dbUserId = await resolveUserId(userId);

  const [policies, valueProfile] = await Promise.all([
    getApplicablePolicies({ userId, domain: source }),
    getValueProfile(userId),
  ]);

  const result = await callAIJson<{ evaluation: AlignmentEvaluationResult }>({
    userId,
    feature: 'alignment_evaluation',
    systemPrompt: ALIGNMENT_EVALUATION_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      description,
      actionPayload: actionPayload || {},
      policies: policies.map((p) => ({
        key: p.key,
        name: p.name,
        description: p.description,
        scope: p.scope,
      })),
      valueProfile: valueProfile ? {
        summary: valueProfile.summary,
        coreValues: valueProfile.coreValues,
        rolePriorities: valueProfile.rolePriorities,
        redLines: valueProfile.redLines,
        aspirationStatement: valueProfile.aspirationStatement,
      } : null,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.5, // Lower temperature for more consistent ethical judgments
  });

  if (!result.success || !result.data) {
    console.error('[Ethics] Failed to evaluate alignment', result.error);
    // Default to blocking if evaluation fails (fail-safe)
    return {
      ethicalRisk: 0.5,
      valueAlignment: 0.5,
      redFlags: [{ key: 'evaluation_failed', severity: 0.5, explanation: 'Alignment evaluation could not be completed' }],
      approvals: [],
      finalRecommendation: 'escalate_to_user',
    };
  }

  const { evaluation } = result.data;

  // Persist evaluation
  const { error } = await supabaseAdmin
    .from('alignment_evaluations')
    .insert({
      user_id: dbUserId,
      source,
      context_type: contextType,
      context_id: contextId ?? null,
      input_summary: description,
      ethical_risk: evaluation.ethicalRisk,
      value_alignment: evaluation.valueAlignment,
      red_flags: evaluation.redFlags ?? [],
      approvals: evaluation.approvals ?? [],
      recommended_adjustment: evaluation.recommendedAdjustment ?? null,
      final_recommendation: evaluation.finalRecommendation,
    });

  if (error) {
    console.error('[Ethics] Failed to log evaluation', error);
    // Don't throw, just log
  }

  return evaluation;
}



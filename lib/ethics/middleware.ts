// Ethical Middleware for Autopilot & Coaches
// lib/ethics/middleware.ts

import { evaluateAlignment } from './evaluator';
import { AlignmentEvaluationInput, AlignmentDecision } from './types';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function logGuardrailEvent(params: {
  userId: string;
  source: string;
  contextType: string;
  contextId?: string;
  policyKeys: string[];
  action: 'blocked' | 'modified' | 'warned_user';
  messageToUser: string;
  details?: any;
}) {
  const dbUserId = await resolveUserId(params.userId);

  const { error } = await supabaseAdmin
    .from('guardrail_events')
    .insert({
      user_id: dbUserId,
      source: params.source,
      context_type: params.contextType,
      context_id: params.contextId ?? null,
      policy_keys: params.policyKeys,
      action: params.action,
      message_to_user: params.messageToUser,
      details: params.details || {},
    });

  if (error) {
    console.error('[Ethics] Failed to log guardrail event', error);
    // Don't throw, just log
  }
}

function describeAutopilotAction(action: any): string {
  // Build human-readable description from action
  const type = action.type || 'unknown';
  const label = action.label || action.title || '';
  
  return `${type}: ${label}`;
}

export async function evaluateAutopilotAction(userId: string, action: any): Promise<{
  status: 'allowed' | 'blocked' | 'needs_changes' | 'escalate';
  evaluation: any;
  adjustedAction?: any;
}> {
  const description = describeAutopilotAction(action);

  const evaluation = await evaluateAlignment({
    userId,
    source: 'autopilot',
    contextType: 'action',
    contextId: action.id,
    description,
    actionPayload: action,
  });

  if (evaluation.finalRecommendation === 'block') {
    await logGuardrailEvent({
      userId,
      source: 'autopilot',
      contextType: 'action',
      contextId: action.id,
      policyKeys: evaluation.redFlags.map((f) => f.key),
      action: 'blocked',
      messageToUser: evaluation.recommendedAdjustment || 'Pulse blocked an autopilot action that did not match your values.',
      details: evaluation,
    });

    return { status: 'blocked', evaluation };
  }

  if (evaluation.finalRecommendation === 'allow_with_changes') {
    await logGuardrailEvent({
      userId,
      source: 'autopilot',
      contextType: 'action',
      contextId: action.id,
      policyKeys: evaluation.redFlags.map((f) => f.key),
      action: 'modified',
      messageToUser: evaluation.recommendedAdjustment || 'Pulse adjusted an autopilot action to better align with your values.',
      details: evaluation,
    });

    // For v1, we'll return the evaluation and let the caller handle adjustments
    return { status: 'needs_changes', evaluation, adjustedAction: action };
  }

  if (evaluation.finalRecommendation === 'escalate_to_user') {
    return { status: 'escalate', evaluation };
  }

  return { status: 'allowed', evaluation };
}

function describeCoachAdvice(advicePlan: any): string {
  // Build human-readable description from coach advice
  if (typeof advicePlan === 'string') {
    return advicePlan;
  }
  if (advicePlan.message) {
    return advicePlan.message;
  }
  if (advicePlan.summary) {
    return advicePlan.summary;
  }
  return JSON.stringify(advicePlan);
}

export async function evaluateCoachAdvice(
  userId: string,
  coachKey: string,
  advicePlan: any
): Promise<{
  advicePlan: any;
  evaluation: any;
  warnings?: string[];
}> {
  const description = describeCoachAdvice(advicePlan);

  const evaluation = await evaluateAlignment({
    userId,
    source: coachKey,
    contextType: 'plan',
    description,
    actionPayload: advicePlan,
  });

  const warnings: string[] = [];

  // For high-risk or low-alignment cases, add warnings
  if (evaluation.ethicalRisk > 0.6) {
    warnings.push('This advice has ethical concerns. Please review carefully.');
  }

  if (evaluation.valueAlignment < 0.4) {
    warnings.push('This advice may conflict with your core values.');
  }

  if (evaluation.redFlags.length > 0) {
    warnings.push(...evaluation.redFlags.map((f) => f.explanation));
  }

  // If blocked, return modified advice plan with warnings
  if (evaluation.finalRecommendation === 'block') {
    await logGuardrailEvent({
      userId,
      source: coachKey,
      contextType: 'plan',
      policyKeys: evaluation.redFlags.map((f) => f.key),
      action: 'blocked',
      messageToUser: evaluation.recommendedAdjustment || 'This advice was blocked as it conflicts with your values.',
      details: evaluation,
    });

    return {
      advicePlan: {
        ...advicePlan,
        blocked: true,
        reason: evaluation.recommendedAdjustment,
      },
      evaluation,
      warnings,
    };
  }

  return { advicePlan, evaluation, warnings: warnings.length > 0 ? warnings : undefined };
}



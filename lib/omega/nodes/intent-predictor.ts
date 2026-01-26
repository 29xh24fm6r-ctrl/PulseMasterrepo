// lib/omega/nodes/intent-predictor.ts
// Intent Predictor: Predict what user needs before they ask

import { executeOmegaPrompt } from "../llm";
import { OMEGA_PROMPTS } from "../prompts";
import type { OmegaState, Intent, ReasoningStep, DraftType, Urgency } from "../types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface IntentPredictionOutput {
  predicted_need: string;
  confidence: number;
  reasoning: string;
  suggested_action: string;
  draft_type: DraftType;
  urgency: Urgency;
}

export async function predictIntent(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseAdmin();

    // Fetch user context
    const [strategiesResult, goalsResult, preferencesResult] = await Promise.all([
      supabase
        .from('pulse_strategies')
        .select('*')
        .eq('user_id', state.userId)
        .eq('active', true)
        .limit(10),
      supabase
        .from('pulse_goals')
        .select('*')
        .eq('user_id', state.userId)
        .eq('status', 'active')
        .limit(10),
      supabase
        .from('pulse_preferences')
        .select('*')
        .eq('user_id', state.userId)
    ]);

    const strategies = strategiesResult.data || [];
    const goals = goalsResult.data || [];
    const preferences = preferencesResult.data || [];

    // Build time context
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const timeContext = {
      localTime: now.toISOString(),
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
      timeOfDay
    };

    const result = await executeOmegaPrompt<IntentPredictionOutput>(
      OMEGA_PROMPTS.PREDICT_INTENT,
      {
        signal: state.signal || {},
        patterns: strategies.map(s => s.pattern),
        goals: goals.map(g => ({ title: g.title, type: g.goal_type, priority: g.priority })),
        strategies: strategies.map(s => ({ type: s.strategy_type, confidence: s.confidence })),
        timeContext
      }
    );

    const durationMs = Date.now() - startTime;

    // Store intent in database
    const intentRecord = await supabase
      .from('pulse_intents')
      .insert({
        user_id: state.userId,
        signal_id: state.signal?.id,
        predicted_need: result.predicted_need,
        confidence: result.confidence,
        reasoning: result.reasoning,
        suggested_action: result.suggested_action,
        draft_type: result.draft_type,
        urgency: result.urgency,
        status: 'pending'
      })
      .select()
      .single();

    const intent: Intent = {
      id: intentRecord.data?.id || crypto.randomUUID(),
      userId: state.userId,
      signalId: state.signal?.id,
      predictedNeed: result.predicted_need,
      confidence: result.confidence,
      reasoning: result.reasoning,
      suggestedAction: result.suggested_action,
      draftType: result.draft_type,
      urgency: result.urgency,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Create reasoning step
    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'predict_intent',
      input: { signal: state.signal, goalsCount: goals.length },
      output: { intent: result },
      reasoning: result.reasoning,
      durationMs
    };

    // Store trace
    await supabase.from('pulse_reasoning_traces').insert({
      user_id: state.userId,
      session_id: state.sessionId,
      trace_type: 'intent_prediction',
      input_context: { signal: state.signal, timeContext },
      reasoning_steps: [step],
      output: result,
      duration_ms: durationMs,
      success: true
    });

    return {
      intent,
      context: {
        recentPatterns: strategies,
        activeGoals: goals,
        preferences,
        timeContext
      },
      reasoningTrace: [...state.reasoningTrace, step]
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'predict_intent',
      input: { signal: state.signal },
      output: {},
      reasoning: `Failed: ${errorMessage}`,
      durationMs
    };

    return {
      reasoningTrace: [...state.reasoningTrace, step],
      error: errorMessage
    };
  }
}

// lib/omega/nodes/draft-generator.ts
// Draft Generator: Create ready-to-use deliverables

import { executeOmegaPrompt } from "../llm";
import { OMEGA_PROMPTS } from "../prompts";
import type { OmegaState, Draft, DraftContent, ReasoningStep } from "../types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface DraftGenerationOutput {
  title: string;
  draft_type: string;
  content: {
    body: string;
    structured?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  confidence: number;
  alternatives?: string[];
}

export async function generateDraft(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  if (!state.intent) {
    return {
      error: 'No intent available for draft generation',
      reasoningTrace: [...state.reasoningTrace, {
        step: state.reasoningTrace.length + 1,
        action: 'generate_draft',
        input: {},
        output: {},
        reasoning: 'Skipped: No intent available',
        durationMs: 0
      }]
    };
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get user preferences for style
    const prefsResult = await supabase
      .from('pulse_preferences')
      .select('*')
      .eq('user_id', state.userId);

    const preferences = prefsResult.data || [];

    // Extract style preferences
    const commStyle = preferences.find(p => p.preference_type === 'communication_style')?.preference_value || { style: 'professional' };
    const detailPref = preferences.find(p => p.preference_type === 'detail_level')?.preference_value || { level: 'medium' };
    const tonePref = preferences.find(p => p.preference_type === 'tone')?.preference_value || { tone: 'friendly_professional' };

    const result = await executeOmegaPrompt<DraftGenerationOutput>(
      OMEGA_PROMPTS.GENERATE_DRAFT,
      {
        intent: {
          predictedNeed: state.intent.predictedNeed,
          suggestedAction: state.intent.suggestedAction,
          draftType: state.intent.draftType,
          urgency: state.intent.urgency
        },
        context: state.context || {},
        commStyle: commStyle,
        detailLevel: detailPref,
        tone: tonePref
      }
    );

    const durationMs = Date.now() - startTime;

    // Store draft in database
    const draftRecord = await supabase
      .from('pulse_drafts')
      .insert({
        user_id: state.userId,
        intent_id: state.intent.id,
        draft_type: result.draft_type,
        title: result.title,
        content: result.content,
        confidence: result.confidence,
        status: 'pending_review'
      })
      .select()
      .single();

    const draft: Draft = {
      id: draftRecord.data?.id || crypto.randomUUID(),
      userId: state.userId,
      intentId: state.intent.id,
      draftType: state.intent.draftType || 'summary',
      title: result.title,
      content: {
        body: result.content.body,
        structured: result.content.structured,
        alternatives: result.alternatives,
        metadata: result.content.metadata
      },
      confidence: result.confidence,
      status: 'pending_review',
      createdAt: new Date().toISOString()
    };

    // Create reasoning step
    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'generate_draft',
      input: { intent: state.intent.predictedNeed },
      output: { title: result.title, confidence: result.confidence },
      reasoning: `Generated ${result.draft_type} draft with ${(result.confidence * 100).toFixed(0)}% confidence`,
      durationMs
    };

    // Store trace
    await supabase.from('pulse_reasoning_traces').insert({
      user_id: state.userId,
      session_id: state.sessionId,
      trace_type: 'draft_generation',
      input_context: { intent: state.intent },
      reasoning_steps: [step],
      output: { draftId: draft.id, title: draft.title },
      duration_ms: durationMs,
      success: true
    });

    return {
      draft,
      reasoningTrace: [...state.reasoningTrace, step]
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'generate_draft',
      input: { intent: state.intent?.predictedNeed },
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

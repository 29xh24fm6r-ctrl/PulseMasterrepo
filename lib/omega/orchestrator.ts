// lib/omega/orchestrator.ts
// Main Omega Prime orchestration engine

import {
  observe,
  predictIntent,
  generateDraft,
  diagnose,
  simulate,
  evolve,
  guardianCheck
} from './nodes';
import type { OmegaState, Signal, Draft } from './types';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface OmegaConfig {
  // Which nodes to run
  runObserver?: boolean;
  runDiagnoser?: boolean;
  runSimulator?: boolean;
  runEvolver?: boolean;

  // Auto-execution settings
  autoExecuteThreshold?: number; // confidence threshold for auto-execute
  skipGuardian?: boolean; // for testing only
}

export interface OmegaResult {
  state: OmegaState;
  draft?: Draft;
  approved: boolean;
  autoExecuted: boolean;
  executionResult?: unknown;
  error?: string;
}

const DEFAULT_CONFIG: OmegaConfig = {
  runObserver: true,
  runDiagnoser: true,
  runSimulator: true,
  runEvolver: true,
  autoExecuteThreshold: 0.85,
  skipGuardian: false
};

/**
 * Main Omega Prime processing pipeline
 * Signal → Observe → Predict → Draft → Diagnose → Simulate → Evolve → Guardian → Execute/Queue
 */
export async function processSignal(
  userId: string,
  signal: Signal,
  config: OmegaConfig = {}
): Promise<OmegaResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const sessionId = crypto.randomUUID();

  // Initialize state
  let state: OmegaState = {
    userId,
    sessionId,
    signal,
    approved: false,
    reasoningTrace: []
  };

  try {
    // Stage 1: Observe (if enabled)
    if (mergedConfig.runObserver) {
      const observeResult = await observe(state);
      state = { ...state, ...observeResult };
    }

    // Stage 2: Predict Intent
    const intentResult = await predictIntent(state);
    state = { ...state, ...intentResult };

    if (!state.intent) {
      return {
        state,
        approved: false,
        autoExecuted: false,
        error: 'Failed to predict intent'
      };
    }

    // Stage 3: Generate Draft
    const draftResult = await generateDraft(state);
    state = { ...state, ...draftResult };

    if (!state.draft) {
      return {
        state,
        approved: false,
        autoExecuted: false,
        error: 'Failed to generate draft'
      };
    }

    // Stage 4: Diagnose (if enabled) - runs in parallel with simulate
    if (mergedConfig.runDiagnoser) {
      const diagnoseResult = await diagnose(state);
      state = { ...state, ...diagnoseResult };
    }

    // Stage 5: Simulate (if enabled)
    if (mergedConfig.runSimulator) {
      const simulateResult = await simulate(state);
      state = { ...state, ...simulateResult };
    }

    // Stage 6: Evolve (if enabled)
    if (mergedConfig.runEvolver) {
      const evolveResult = await evolve(state);
      state = { ...state, ...evolveResult };
    }

    // Stage 7: Guardian Check
    if (!mergedConfig.skipGuardian) {
      const guardianResult = await guardianCheck(state);
      state = { ...state, ...guardianResult };
    } else {
      state.approved = true;
    }

    // Stage 8: Execute or Queue
    const shouldAutoExecute =
      state.approved &&
      state.draft.confidence >= (mergedConfig.autoExecuteThreshold || 0.85);

    if (shouldAutoExecute) {
      const executionResult = await executeDraft(state.draft, state.userId);
      return {
        state,
        draft: state.draft,
        approved: true,
        autoExecuted: true,
        executionResult
      };
    }

    // Queue for review
    await queueForReview(state.draft, state.userId);

    return {
      state,
      draft: state.draft,
      approved: state.approved,
      autoExecuted: false
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      state,
      approved: false,
      autoExecuted: false,
      error: errorMessage
    };
  }
}

/**
 * Execute an approved draft
 */
async function executeDraft(draft: Draft, userId: string): Promise<unknown> {
  const supabase = getSupabaseAdmin();

  // Update draft status
  await supabase
    .from('pulse_drafts')
    .update({
      status: 'auto_executed',
      executed_at: new Date().toISOString()
    })
    .eq('id', draft.id);

  // Execute based on draft type
  switch (draft.draftType) {
    case 'email':
      // Integration point: send email
      return { type: 'email', status: 'queued' };

    case 'task':
      // Integration point: create task
      return { type: 'task', status: 'created' };

    case 'meeting_prep':
      // Integration point: add to calendar notes
      return { type: 'meeting_prep', status: 'saved' };

    case 'report':
    case 'summary':
    case 'action_plan':
      // These are typically just stored/displayed
      return { type: draft.draftType, status: 'ready' };

    default:
      return { type: 'unknown', status: 'stored' };
  }
}

/**
 * Queue a draft for user review
 */
async function queueForReview(draft: Draft, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Draft is already in pending_review status from generation
  // Just ensure it's properly indexed/visible

  // Optionally create a notification
  // await createNotification(userId, 'draft_pending', draft.id);
}

/**
 * Run the recursive self-improvement loop
 * This is meant to run periodically (e.g., daily) not on every signal
 */
export async function runSelfImprovementLoop(userId: string): Promise<{
  cognitiveIssues: number;
  improvementsProposed: number;
}> {
  const sessionId = crypto.randomUUID();

  let state: OmegaState = {
    userId,
    sessionId,
    approved: false,
    reasoningTrace: []
  };

  // Run diagnosis
  const diagnoseResult = await diagnose(state);
  state = { ...state, ...diagnoseResult };

  // Run evolution
  const evolveResult = await evolve(state);
  state = { ...state, ...evolveResult };

  return {
    cognitiveIssues: state.cognitiveIssues?.length || 0,
    improvementsProposed: state.proposedImprovements?.length || 0
  };
}

/**
 * Process user feedback on a draft
 */
export async function processFeedback(
  draftId: string,
  userId: string,
  action: 'approve' | 'reject' | 'edit',
  feedback?: string,
  editedContent?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (action === 'approve') {
    // Get the draft
    const { data: draft } = await supabase
      .from('pulse_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draft) {
      // Execute it
      await executeDraft(draft as unknown as Draft, userId);

      // Record positive outcome
      await supabase.from('pulse_outcomes').insert({
        user_id: userId,
        draft_id: draftId,
        outcome_type: 'success',
        user_notes: feedback
      });
    }
  } else if (action === 'reject') {
    // Update draft status
    await supabase
      .from('pulse_drafts')
      .update({
        status: 'rejected',
        user_feedback: feedback
      })
      .eq('id', draftId);

    // Record negative outcome for learning
    await supabase.from('pulse_outcomes').insert({
      user_id: userId,
      draft_id: draftId,
      outcome_type: 'failure',
      user_notes: feedback
    });
  } else if (action === 'edit') {
    // Update draft with edited content
    await supabase
      .from('pulse_drafts')
      .update({
        status: 'edited',
        content: { body: editedContent },
        user_feedback: feedback
      })
      .eq('id', draftId);

    // Record partial outcome
    await supabase.from('pulse_outcomes').insert({
      user_id: userId,
      draft_id: draftId,
      outcome_type: 'partial',
      user_notes: feedback,
      outcome_signal: { edited: true }
    });
  }
}

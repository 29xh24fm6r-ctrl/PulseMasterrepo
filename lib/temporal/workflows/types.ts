// lib/temporal/workflows/types.ts
// Canonical types for OmegaTrustWorkflow
// SPEC: These types are authoritative - do not drift

// ============================================
// WORKFLOW INPUT/OUTPUT
// ============================================

export interface OmegaTrustWorkflowInput {
  signalId: string;
  userId: string;

  source: 'calendar' | 'email' | 'manual' | 'scheduled';
  signalType: string;
  payload: Record<string, unknown>;

  priority: 'low' | 'normal' | 'high' | 'urgent';

  maxWaitForReview: string; // ISO duration e.g. "PT1H"
  correlationId: string;
}

export interface OmegaTrustWorkflowOutput {
  status: 'completed' | 'blocked' | 'rejected' | 'timeout' | 'error';

  guardianDecision: GuardianDecision;
  autonomyLevelUsed: number;

  outcome?: {
    type: OutcomeType;
    notes?: string;
  };

  autonomyChanged: boolean;
  newAutonomyLevel?: number;

  startedAt: string;
  completedAt: string;
  durationMs: number;
}

// ============================================
// GUARDIAN DECISION (Canonical Shape)
// ============================================

export interface GuardianDecision {
  allowed: boolean;

  requiredAction: 'execute' | 'queue_review' | 'block';

  explanation: string;

  constraintHits: Array<{
    name: string;
    severity: 'soft' | 'hard';
    blocked: boolean;
  }>;
}

// ============================================
// ACTIVITY INTERFACES
// ============================================

// 8.1 processSignalWithOmega
export interface ProcessSignalInput {
  signalId: string;
  userId: string;
  source: string;
  signalType: string;
  payload: Record<string, unknown>;
}

export interface ProcessSignalOutput {
  intent: {
    id: string;
    description: string;
    predictedConfidence: number;
  };

  draft?: {
    id: string;
    type: string;
    content: Record<string, unknown>;
    confidence: number;
  };

  guardianDecision: GuardianDecision;

  confidenceEventIds: string[];

  // Pass-through for downstream activities
  sessionId: string;
  reasoningTrace: unknown[];
}

// 8.2 persistDraft
export interface PersistDraftInput {
  draftId: string;
  userId: string;
  content: Record<string, unknown>;
  draftType: string;
  confidence: number;
  sessionId: string;
}

// 8.3 executeDraftAction
export interface ExecuteDraftInput {
  draftId: string;
  draftType: string;
  userId: string;

  autonomyLevel: number;
  guardianApproved: true; // Literal true - must be gated

  idempotencyKey: string;
}

export interface ExecuteDraftOutput {
  executed: boolean;
  skipped: boolean;
  idempotent: boolean;
  action?: string;
  status: string;
  executedAt?: string;
  error?: string;
}

// 8.4 queueForReview
export interface QueueForReviewInput {
  draftId: string;
  userId: string;
  sessionId: string;
  guardianDecision: GuardianDecision;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface QueueForReviewOutput {
  queued: boolean;
  reviewRequestId: string;
}

// 8.6 recordOutcome
export type OutcomeType =
  | 'success'
  | 'partial'
  | 'modified'
  | 'failure'
  | 'rejected'
  | 'timeout'
  | 'success_after_timeout';

export interface RecordOutcomeInput {
  userId: string;
  sessionId: string;
  draftId?: string;
  confidenceEventIds: string[];
  outcomeType: OutcomeType;
  notes?: string;
}

export interface RecordOutcomeOutput {
  recorded: boolean;
  outcomeId: string;
}

// ============================================
// INTERNAL WORKFLOW STATE
// ============================================

export interface WorkflowInternalState {
  startedAt: string;
  sessionId: string;
  autonomyLevel: number;

  processResult?: ProcessSignalOutput;
  executionResult?: ExecuteDraftOutput;
  queueResult?: QueueForReviewOutput;
  outcomeResult?: RecordOutcomeOutput;

  errors: string[];
}

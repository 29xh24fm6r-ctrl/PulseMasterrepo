// lib/temporal/index.ts
// Main exports for Temporal integration

// Client utilities
export { temporalClient, getOmegaTaskQueue, signalWorkflowId } from "./client";

// Legacy workflow types (for backwards compatibility)
export type {
  OmegaWorkflowInput,
  OmegaWorkflowResult,
} from "./workflows/omegaSignal.workflow";

// Legacy activity types
export type { RunOmegaInput } from "./activities/runOmegaGraph.activity";
export type { ExecutionResult } from "./activities/executeDraft.activity";
export type { QueueResult } from "./activities/queueForReview.activity";

// ============================================
// OmegaTrustWorkflow Types (Canonical)
// ============================================

export type {
  OmegaTrustWorkflowInput,
  OmegaTrustWorkflowOutput,
  GuardianDecision,
  ProcessSignalInput,
  ProcessSignalOutput,
  PersistDraftInput,
  ExecuteDraftInput,
  ExecuteDraftOutput,
  QueueForReviewInput,
  QueueForReviewOutput,
  RecordOutcomeInput,
  RecordOutcomeOutput,
  OutcomeType,
} from "./workflows/types";

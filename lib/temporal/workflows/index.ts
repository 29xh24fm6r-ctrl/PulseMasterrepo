// lib/temporal/workflows/index.ts
// Export all workflows for worker registration

// Legacy workflow (kept for backwards compatibility)
export { omegaSignalWorkflow, scheduledOmegaSignalWorkflow } from "./omegaSignal.workflow";
export type { OmegaWorkflowInput, OmegaWorkflowResult } from "./omegaSignal.workflow";

// Canonical OmegaTrustWorkflow (Phase 1)
export { OmegaTrustWorkflow } from "./omegaTrust.workflow";

// Types
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
} from "./types";

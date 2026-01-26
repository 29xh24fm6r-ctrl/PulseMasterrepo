// lib/temporal/activities/index.ts
// Re-export all activities for worker registration

// Legacy activities (kept for backwards compatibility)
export { runOmegaGraphActivity } from "./runOmegaGraph.activity";
export type { RunOmegaInput } from "./runOmegaGraph.activity";

export { persistOmegaActivity } from "./persistOmega.activity";

export { executeDraftActivity } from "./executeDraft.activity";
export type { ExecutionResult } from "./executeDraft.activity";

export { queueForReviewActivity } from "./queueForReview.activity";
export type { QueueResult } from "./queueForReview.activity";

// ============================================
// OmegaTrustWorkflow Activities (Canonical)
// ============================================

export { processSignalWithOmegaActivity } from "./processSignal.activity";

export { persistDraftActivity } from "./persistDraft.activity";

export { executeDraftActionActivity } from "./executeDraftAction.activity";

export { queueForReviewActivity as queueForReviewNewActivity } from "./queueForReviewNew.activity";

export { recordOutcomeActivity } from "./recordOutcome.activity";

// Re-export types
export type {
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
} from "../workflows/types";

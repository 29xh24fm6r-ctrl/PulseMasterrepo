import {
  listSignals,
  listDrafts,
  listOutcomes,
  listReviewRequests,
  listExecutionLog,
  listObserverEvents,
  listConfidenceEvents,
} from "./pulse_read.js";
import { viewerEdgeStatus, health } from "./diagnostics.js";

export const tools: Record<string, (input?: unknown) => Promise<unknown>> = {
  "pulse.health": health,
  "pulse.viewer_edge_status": viewerEdgeStatus,
  "pulse.list_signals": listSignals,
  "pulse.list_drafts": listDrafts,
  "pulse.list_outcomes": listOutcomes,
  "pulse.list_review_requests": listReviewRequests,
  "pulse.list_execution_log": listExecutionLog,
  "pulse.list_observer_events": listObserverEvents,
  "pulse.list_confidence_events": listConfidenceEvents,
};

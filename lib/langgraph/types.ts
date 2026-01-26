// lib/langgraph/types.ts
// TypeScript interfaces and state annotation for LangGraph Omega

import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { safeAppend, safeMerge } from "./utils";

// Signal from any source
export interface Signal {
  id: string;
  userId: string;
  source: string;
  signalType: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Predicted intent
export interface Intent {
  id?: string;
  signalId: string;
  predictedNeed: string;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  draftType: string;
  urgency: "immediate" | "soon" | "when_convenient";
}

// Generated draft
export interface Draft {
  id?: string;
  intentId: string;
  draftType: string;
  title: string;
  content: Record<string, any>;
  confidence: number;
  status: "pending_review" | "approved" | "rejected" | "auto_executed";
}

// Observation from Observer node
export interface Observation {
  type: "pattern" | "anomaly" | "success" | "failure" | "opportunity" | "risk";
  description: string;
  confidence: number;
  evidence: string;
}

// Cognitive limit from Diagnoser
export interface CognitiveLimit {
  type: "prediction_blind_spot" | "domain_weakness" | "timing_error" | "confidence_miscalibration";
  description: string;
  severity: "low" | "medium" | "high";
  evidence: string[];
  suggestedRemedy: string;
}

// Simulation result
export interface Simulation {
  scenario: string;
  probability: number;
  predictedOutcome: string;
  risks: string[];
  opportunities: string[];
}

// Proposed improvement
export interface Improvement {
  type: "prompt_adjustment" | "strategy_update" | "threshold_change" | "new_pattern";
  target: string;
  currentState: Record<string, any>;
  proposedChange: Record<string, any>;
  expectedImpact: string;
  risk: string;
}

// Guardian review result
export interface GuardianReview {
  approved: boolean;
  constraintChecks: {
    constraint: string;
    passed: boolean;
    reason: string;
  }[];
  modificationsRequired: string[];
  riskAssessment: "low" | "medium" | "high";
  recommendation: "approve" | "modify" | "reject";
}

// Reasoning step for traces
export interface ReasoningStep {
  node: string;
  input: Record<string, any>;
  output: Record<string, any>;
  durationMs: number;
  timestamp: string;
}

// Main Omega state that flows through the graph
export interface OmegaState {
  userId: string;
  sessionId: string;
  startedAt: string;
  signal: Signal | null;
  userContext: Record<string, any>;
  observations: Observation[];
  intent: Intent | null;
  draft: Draft | null;
  cognitiveIssues: CognitiveLimit[];
  simulations: Simulation[];
  proposedImprovements: Improvement[];
  guardianReview: GuardianReview | null;
  approved: boolean;
  shouldAutoExecute: boolean;
  executionResult: Record<string, any> | null;
  reasoningTrace: ReasoningStep[];
  errors: string[];
  messages: BaseMessage[];
}

// Single source of truth LangGraph state annotation with safe reducers
export const OmegaStateAnnotation = Annotation.Root({
  userId: Annotation<string>({
    reducer: (a, b) => safeMerge(a, b),
    default: () => "",
  }),
  sessionId: Annotation<string>({
    reducer: (a, b) => safeMerge(a, b),
    default: () => "",
  }),
  startedAt: Annotation<string>({
    reducer: (a, b) => safeMerge(a, b),
    default: () => "",
  }),
  signal: Annotation<Signal | null>({
    reducer: (a, b) => safeMerge(a, b),
    default: () => null,
  }),
  userContext: Annotation<Record<string, any>>({
    reducer: (a, b) => (b ? { ...a, ...b } : a),
    default: () => ({}),
  }),
  observations: Annotation<Observation[]>({
    reducer: (a, b) => safeAppend(a, b),
    default: () => [],
  }),
  intent: Annotation<Intent | null>({
    reducer: (a, b) => safeMerge(a, b),
    default: () => null,
  }),
  draft: Annotation<Draft | null>({
    reducer: (a, b) => safeMerge(a, b),
    default: () => null,
  }),
  cognitiveIssues: Annotation<CognitiveLimit[]>({
    reducer: (a, b) => safeAppend(a, b),
    default: () => [],
  }),
  simulations: Annotation<Simulation[]>({
    reducer: (a, b) => safeAppend(a, b),
    default: () => [],
  }),
  proposedImprovements: Annotation<Improvement[]>({
    reducer: (a, b) => safeAppend(a, b),
    default: () => [],
  }),
  guardianReview: Annotation<GuardianReview | null>({
    reducer: (a, b) => safeMerge(a, b),
    default: () => null,
  }),
  approved: Annotation<boolean>({
    reducer: (a, b) => (typeof b === "boolean" ? b : a),
    default: () => false,
  }),
  shouldAutoExecute: Annotation<boolean>({
    reducer: (a, b) => (typeof b === "boolean" ? b : a),
    default: () => false,
  }),
  executionResult: Annotation<Record<string, any> | null>({
    reducer: (a, b) => safeMerge(a, b),
    default: () => null,
  }),
  reasoningTrace: Annotation<ReasoningStep[]>({
    reducer: (a, b) => safeAppend(a, b),
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (a, b) => safeAppend(a, b),
    default: () => [],
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => safeAppend(a, b),
    default: () => [],
  }),
});

// Type helper for graph state
export type OmegaGraphState = typeof OmegaStateAnnotation.State;

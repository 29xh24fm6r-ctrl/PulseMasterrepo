// lib/omega/types.ts
// Core types for Pulse Omega Prime

// ============================================
// STAGE 1: ASI-O Types
// ============================================

export type SignalSource = 'calendar' | 'email' | 'crm' | 'finance' | 'task' | 'manual';
export type SignalType = 'event_created' | 'deadline_approaching' | 'deal_stalled' | 'message_received' | 'task_due' | 'pattern_detected';

export interface Signal {
  id: string;
  userId: string;
  source: SignalSource;
  signalType: SignalType;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  processed: boolean;
  processedAt?: string;
  createdAt: string;
}

export type DraftType = 'meeting_prep' | 'email' | 'report' | 'action_plan' | 'summary' | 'task';
export type Urgency = 'immediate' | 'soon' | 'when_convenient';
export type IntentStatus = 'pending' | 'acted' | 'dismissed';

export interface Intent {
  id: string;
  userId: string;
  signalId?: string;
  predictedNeed: string;
  confidence: number;
  reasoning?: string;
  suggestedAction: string;
  draftType?: DraftType;
  urgency: Urgency;
  status: IntentStatus;
  createdAt: string;
}

export type DraftStatus = 'pending_review' | 'approved' | 'rejected' | 'auto_executed' | 'edited';

export interface Draft {
  id: string;
  userId: string;
  intentId?: string;
  draftType: DraftType;
  title: string;
  content: DraftContent;
  confidence: number;
  status: DraftStatus;
  userFeedback?: string;
  executedAt?: string;
  createdAt: string;
}

export interface DraftContent {
  body: string;
  structured?: Record<string, unknown>;
  alternatives?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// STAGE 2: ASI-E Types
// ============================================

export type OutcomeType = 'success' | 'partial' | 'failure' | 'unknown';

export interface Outcome {
  id: string;
  userId: string;
  draftId?: string;
  outcomeType: OutcomeType;
  outcomeSignal?: Record<string, unknown>;
  userRating?: number; // 1-5
  userNotes?: string;
  measuredAt: string;
  createdAt: string;
}

export type StrategyType = 'signal_pattern' | 'draft_template' | 'timing' | 'tone';

export interface Strategy {
  id: string;
  userId: string;
  strategyType: StrategyType;
  pattern: Record<string, unknown>;
  successCount: number;
  failureCount: number;
  confidence: number;
  active: boolean;
  learnedFrom?: string[]; // outcome_ids
  createdAt: string;
  updatedAt: string;
}

export type PreferenceType = 'communication_style' | 'review_threshold' | 'auto_execute_domains' | 'timing';

export interface Preference {
  id: string;
  userId: string;
  preferenceType: PreferenceType;
  preferenceValue: Record<string, unknown>;
  confidence: number;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// STAGE 3: OMEGA Types
// ============================================

export type TraceType = 'intent_prediction' | 'draft_generation' | 'strategy_selection' | 'simulation' | 'observation' | 'diagnosis' | 'evolution';

export interface ReasoningStep {
  step: number;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  reasoning: string;
  durationMs?: number;
}

export interface ReasoningTrace {
  id: string;
  userId: string;
  sessionId?: string;
  traceType: TraceType;
  inputContext: Record<string, unknown>;
  reasoningSteps: ReasoningStep[];
  output: Record<string, unknown>;
  durationMs?: number;
  success?: boolean;
  failureReason?: string;
  createdAt: string;
}

export type CognitiveLimitType = 'prediction_blind_spot' | 'domain_weakness' | 'timing_error' | 'confidence_miscalibration';
export type Severity = 'low' | 'medium' | 'high';

export interface CognitiveLimit {
  id: string;
  userId: string;
  limitType: CognitiveLimitType;
  description: string;
  evidence: Record<string, unknown>;
  severity: Severity;
  addressed: boolean;
  improvementId?: string;
  discoveredAt: string;
}

export type SimulationType = 'strategy_test' | 'counterfactual' | 'future_projection';

export interface Simulation {
  id: string;
  userId: string;
  simulationType: SimulationType;
  hypothesis: string;
  inputState: Record<string, unknown>;
  simulatedActions: Record<string, unknown>[];
  predictedOutcomes: Record<string, unknown>[];
  actualOutcome?: Record<string, unknown>;
  accuracyScore?: number;
  createdAt: string;
}

export type ImprovementType = 'prompt_adjustment' | 'strategy_update' | 'threshold_change' | 'new_pattern';
export type ImprovementStatus = 'proposed' | 'testing' | 'approved' | 'rejected' | 'rolled_back';

export interface Improvement {
  id: string;
  userId: string;
  improvementType: ImprovementType;
  targetComponent: string;
  currentState: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  expectedImpact: string;
  simulationId?: string;
  status: ImprovementStatus;
  guardianReview?: GuardianReview;
  approvedAt?: string;
  createdAt: string;
}

export type ConstraintType = 'hard_limit' | 'soft_limit' | 'user_override';

export interface Constraint {
  id: string;
  constraintType: ConstraintType;
  constraintName: string;
  description: string;
  rule: Record<string, unknown>;
  immutable: boolean;
  violationCount: number;
  createdAt: string;
}

export interface ConstraintViolation {
  id: string;
  userId: string;
  constraintId?: string;
  attemptedAction: Record<string, unknown>;
  violationReason: string;
  blocked: boolean;
  overrideRequested: boolean;
  overrideGranted: boolean;
  createdAt: string;
}

export interface GuardianReview {
  approved: boolean;
  constraintChecks: {
    constraint: string;
    passed: boolean;
    reason: string;
  }[];
  modificationsRequired?: string[];
  riskAssessment: 'low' | 'medium' | 'high';
  recommendation: 'approve' | 'modify' | 'reject';
}

// ============================================
// STAGE 4: OMEGA PRIME Types
// ============================================

export type GoalType = 'career' | 'financial' | 'health' | 'relationship' | 'skill' | 'legacy';
export type TimeHorizon = '30_days' | '90_days' | '1_year' | '5_years' | 'lifetime';
export type GoalStatus = 'active' | 'paused' | 'achieved' | 'abandoned';

export interface Goal {
  id: string;
  userId: string;
  goalType: GoalType;
  title: string;
  description?: string;
  targetState: Record<string, unknown>;
  currentState?: Record<string, unknown>;
  timeHorizon?: TimeHorizon;
  priority: number; // 1-10
  progress: number; // 0-1
  status: GoalStatus;
  parentGoalId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TrajectoryType = 'current_path' | 'optimized' | 'alternative';

export interface Milestone {
  date: string;
  state: string;
  probability: number;
}

export interface Trajectory {
  id: string;
  userId: string;
  trajectoryType: TrajectoryType;
  timeHorizon: TimeHorizon;
  startingState: Record<string, unknown>;
  projectedMilestones: Milestone[];
  projectedEndState: Record<string, unknown>;
  confidence: number;
  assumptions?: Record<string, unknown>;
  risks?: Record<string, unknown>;
  opportunities?: Record<string, unknown>;
  createdAt: string;
}

export type LifeEventType = 'milestone' | 'setback' | 'opportunity' | 'decision' | 'external';
export type Significance = 'low' | 'medium' | 'high' | 'critical';

export interface LifeEvent {
  id: string;
  userId: string;
  eventType: LifeEventType;
  title: string;
  description?: string;
  impactAssessment?: Record<string, unknown>;
  affectedGoals?: string[];
  significance: Significance;
  occurredAt: string;
  createdAt: string;
}

export type ConnectionType = 'causal' | 'correlated' | 'tradeoff' | 'synergy';
export type Domain = 'health' | 'finance' | 'career' | 'relationships' | 'personal_growth' | 'lifestyle';

export interface DomainConnection {
  id: string;
  userId: string;
  domainA: Domain;
  domainB: Domain;
  connectionType: ConnectionType;
  strength: number;
  description?: string;
  evidence?: Record<string, unknown>;
  discoveredAt: string;
}

// ============================================
// Omega State (for agent orchestration)
// ============================================

export interface OmegaState {
  userId: string;
  sessionId: string;

  // Input
  signal?: Signal;
  context?: UserContext;

  // Observer outputs
  observations?: Observation[];

  // Intent prediction
  intent?: Intent;

  // Draft generation
  draft?: Draft;

  // Diagnoser outputs
  cognitiveIssues?: CognitiveLimit[];

  // Simulator outputs
  simulations?: Simulation[];

  // Evolver outputs
  proposedImprovements?: Improvement[];

  // Guardian outputs
  guardianReview?: GuardianReview;
  approved: boolean;

  // Trace
  reasoningTrace: ReasoningStep[];

  // Error handling
  error?: string;
}

export interface UserContext {
  recentPatterns?: Strategy[];
  activeGoals?: Goal[];
  currentStrategies?: Strategy[];
  preferences?: Preference[];
  timeContext?: {
    localTime: string;
    dayOfWeek: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  };
}

export interface Observation {
  type: 'pattern' | 'anomaly' | 'success' | 'failure' | 'opportunity' | 'risk';
  description: string;
  confidence: number;
  evidence: string;
}

// ============================================
// Agent Node Results
// ============================================

export interface NodeResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
  reasoning?: string;
}

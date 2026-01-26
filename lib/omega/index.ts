// lib/omega/index.ts
// Pulse Omega Prime - Main exports

// Core orchestration
export {
  processSignal,
  runSelfImprovementLoop,
  processFeedback,
  type OmegaConfig,
  type OmegaResult
} from './orchestrator';

// Types
export * from './types';

// Prompts
export { OMEGA_PROMPTS } from './prompts';

// Individual nodes (for advanced usage)
export {
  observe,
  predictIntent,
  generateDraft,
  diagnose,
  simulate,
  evolve,
  guardianCheck
} from './nodes';

// Confidence Ledger - Track predictions vs outcomes
export {
  recordConfidencePrediction,
  recordConfidenceOutcome,
  getCalibrationData,
  getConfidenceAdjustment,
  checkEarnedAutonomy,
  getConfidenceEvent,
  getRecentConfidenceEvents,
  type ConfidenceEvent,
  type ConfidenceOutcome,
  type CalibrationBucket,
  type EarnedAutonomyResult,
} from './confidence-ledger';

// Autonomy Management - Track and manage user autonomy levels
export {
  getUserAutonomyLevel,
  checkConstraintsWithEscalation,
  setAutonomyOverride,
  clearAutonomyOverride,
  getAutonomyLevelDescriptions,
  getAutonomyHistory,
  type EscalationLevel,
  type AutonomyLevel,
  type ConstraintCheck,
  type GuardianDecision,
  type UserAutonomyInfo,
} from './autonomy';

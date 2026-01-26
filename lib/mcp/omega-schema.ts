// lib/mcp/omega-schema.ts
// Static schema snapshot for MCP observability
// This file documents the Omega Prime database structure
// Update manually when schema changes

export interface TableSchema {
  description: string;
  columns: string[];
  safeColumns: string[];  // Columns safe for MCP to query (excludes large JSON blobs)
  isGlobal?: boolean;     // True if table is not user-scoped
}

export const OMEGA_SCHEMA: {
  tables: Record<string, TableSchema>;
  views: Record<string, TableSchema>;
} = {
  tables: {
    pulse_signals: {
      description: "Incoming signals from all sources",
      columns: ["id", "user_id", "source", "signal_type", "payload", "metadata", "processed", "processed_at", "created_at"],
      safeColumns: ["id", "user_id", "source", "signal_type", "processed", "processed_at", "created_at"],
      // payload and metadata excluded - large JSON
    },
    pulse_intents: {
      description: "Predicted intents from signals",
      columns: ["id", "user_id", "signal_id", "predicted_need", "confidence", "reasoning", "suggested_action", "status", "created_at"],
      safeColumns: ["id", "user_id", "signal_id", "predicted_need", "confidence", "suggested_action", "status", "created_at"],
      // reasoning excluded - large text
    },
    pulse_drafts: {
      description: "Proactively generated drafts",
      columns: ["id", "user_id", "intent_id", "draft_type", "title", "content", "confidence", "status", "user_feedback", "executed_at", "created_at"],
      safeColumns: ["id", "user_id", "intent_id", "draft_type", "title", "confidence", "status", "user_feedback", "executed_at", "created_at"],
      // content excluded - large text
    },
    pulse_outcomes: {
      description: "Track outcomes after draft execution",
      columns: ["id", "user_id", "draft_id", "outcome_type", "outcome_signal", "user_rating", "user_notes", "measured_at", "created_at"],
      safeColumns: ["id", "user_id", "draft_id", "outcome_type", "user_rating", "measured_at", "created_at"],
      // outcome_signal and user_notes excluded - potentially large
    },
    pulse_strategies: {
      description: "Learned strategies that work",
      columns: ["id", "user_id", "strategy_type", "pattern", "success_count", "failure_count", "confidence", "active", "learned_from", "created_at", "updated_at"],
      safeColumns: ["id", "user_id", "strategy_type", "success_count", "failure_count", "confidence", "active", "created_at", "updated_at"],
      // pattern and learned_from excluded - large JSON
    },
    pulse_preferences: {
      description: "User preferences learned over time",
      columns: ["id", "user_id", "preference_type", "preference_value", "confidence", "evidence_count", "created_at", "updated_at"],
      safeColumns: ["id", "user_id", "preference_type", "preference_value", "confidence", "evidence_count", "created_at", "updated_at"],
    },
    pulse_reasoning_traces: {
      description: "Observer: reasoning traces",
      columns: ["id", "user_id", "session_id", "trace_type", "input_context", "reasoning_steps", "output", "duration_ms", "success", "failure_reason", "created_at"],
      safeColumns: ["id", "user_id", "session_id", "trace_type", "duration_ms", "success", "failure_reason", "created_at"],
      // input_context, reasoning_steps, output excluded - large JSON/text
    },
    pulse_cognitive_limits: {
      description: "Diagnoser: identified cognitive limits",
      columns: ["id", "user_id", "limit_type", "description", "evidence", "severity", "addressed", "improvement_id", "discovered_at"],
      safeColumns: ["id", "user_id", "limit_type", "severity", "addressed", "improvement_id", "discovered_at"],
      // description and evidence excluded - potentially large
    },
    pulse_simulations: {
      description: "Simulator: hypothetical scenarios tested",
      columns: ["id", "user_id", "simulation_type", "hypothesis", "input_state", "simulated_actions", "predicted_outcomes", "actual_outcome", "accuracy_score", "created_at"],
      safeColumns: ["id", "user_id", "simulation_type", "accuracy_score", "created_at"],
      // hypothesis, input_state, simulated_actions, predicted_outcomes, actual_outcome excluded - large JSON
    },
    pulse_improvements: {
      description: "Evolver: proposed improvements",
      columns: ["id", "user_id", "improvement_type", "target_component", "current_state", "proposed_change", "expected_impact", "simulation_id", "status", "guardian_review", "approved_at", "created_at"],
      safeColumns: ["id", "user_id", "improvement_type", "target_component", "expected_impact", "simulation_id", "status", "approved_at", "created_at"],
      // current_state, proposed_change, guardian_review excluded - large JSON
    },
    pulse_constraints: {
      description: "Guardian: immutable constraints",
      columns: ["id", "constraint_type", "constraint_name", "description", "rule", "immutable", "escalation_level", "min_autonomy_level", "allows_earned_override", "violation_count", "created_at"],
      safeColumns: ["id", "constraint_type", "constraint_name", "description", "immutable", "escalation_level", "min_autonomy_level", "allows_earned_override", "violation_count", "created_at"],
      isGlobal: true,  // Constraints are system-wide, not user-scoped
      // rule excluded - large JSON
    },
    pulse_constraint_violations: {
      description: "Guardian: constraint violations log",
      columns: ["id", "user_id", "constraint_id", "attempted_action", "violation_reason", "blocked", "override_requested", "override_granted", "created_at"],
      safeColumns: ["id", "user_id", "constraint_id", "violation_reason", "blocked", "override_requested", "override_granted", "created_at"],
      // attempted_action excluded - potentially large JSON
    },
    pulse_goals: {
      description: "Long-horizon goals",
      columns: ["id", "user_id", "goal_type", "title", "description", "target_state", "current_state", "time_horizon", "priority", "progress", "status", "parent_goal_id", "created_at", "updated_at"],
      safeColumns: ["id", "user_id", "goal_type", "title", "time_horizon", "priority", "progress", "status", "parent_goal_id", "created_at", "updated_at"],
      // description, target_state, current_state excluded - large JSON/text
    },
    pulse_trajectories: {
      description: "Life trajectory projections",
      columns: ["id", "user_id", "trajectory_type", "time_horizon", "starting_state", "projected_milestones", "projected_end_state", "confidence", "assumptions", "risks", "opportunities", "created_at"],
      safeColumns: ["id", "user_id", "trajectory_type", "time_horizon", "confidence", "created_at"],
      // starting_state, projected_milestones, projected_end_state, assumptions, risks, opportunities excluded - large JSON
    },
    pulse_life_events: {
      description: "Life events and their impacts",
      columns: ["id", "user_id", "event_type", "title", "description", "impact_assessment", "affected_goals", "significance", "occurred_at", "created_at"],
      safeColumns: ["id", "user_id", "event_type", "title", "significance", "occurred_at", "created_at"],
      // description, impact_assessment, affected_goals excluded - large JSON/text
    },
    pulse_domain_connections: {
      description: "Cross-domain connections",
      columns: ["id", "user_id", "domain_a", "domain_b", "connection_type", "strength", "description", "evidence", "discovered_at"],
      safeColumns: ["id", "user_id", "domain_a", "domain_b", "connection_type", "strength", "discovered_at"],
      // description and evidence excluded - potentially large
    },
    pulse_confidence_events: {
      description: "Confidence ledger: tracks predicted vs actual",
      columns: ["id", "user_id", "session_id", "node", "prediction_type", "prediction_id", "predicted_confidence", "context_snapshot", "outcome", "outcome_confidence", "outcome_notes", "outcome_recorded_at", "confidence_error", "created_at"],
      safeColumns: ["id", "user_id", "session_id", "node", "prediction_type", "prediction_id", "predicted_confidence", "outcome", "outcome_confidence", "outcome_recorded_at", "confidence_error", "created_at"],
      // context_snapshot and outcome_notes excluded - large JSON/text
    },
    pulse_user_autonomy: {
      description: "User autonomy levels",
      columns: ["id", "user_id", "current_level", "level_reason", "calibration_score", "total_predictions", "level_history", "manual_override", "override_reason", "override_expires_at", "last_evaluated_at", "created_at", "updated_at"],
      safeColumns: ["id", "user_id", "current_level", "level_reason", "calibration_score", "total_predictions", "manual_override", "override_reason", "override_expires_at", "last_evaluated_at", "created_at", "updated_at"],
      // level_history excluded - large JSON array
    },
    pulse_autonomy_levels: {
      description: "Autonomy level definitions",
      columns: ["level", "name", "description", "auto_execute_allowed", "requires_confirmation", "example_actions"],
      safeColumns: ["level", "name", "description", "auto_execute_allowed"],
      isGlobal: true,  // Level definitions are system-wide
      // requires_confirmation and example_actions excluded - JSON arrays
    },
  },
  views: {
    pulse_confidence_calibration: {
      description: "Aggregated confidence calibration data",
      columns: ["user_id", "node", "prediction_type", "confidence_bucket", "total_predictions", "successes", "partials", "failures", "modified", "rejected", "avg_predicted", "actual_success_rate", "avg_calibration_error", "calibration_gap"],
      safeColumns: ["user_id", "node", "prediction_type", "confidence_bucket", "total_predictions", "successes", "partials", "failures", "modified", "rejected", "avg_predicted", "actual_success_rate", "avg_calibration_error", "calibration_gap"],
      // All columns safe - this is aggregated data
    },
  },
};

// Allowlist of tables MCP can query
export const ALLOWED_TABLES = [
  "pulse_signals",
  "pulse_intents",
  "pulse_drafts",
  "pulse_outcomes",
  "pulse_strategies",
  "pulse_preferences",
  "pulse_reasoning_traces",
  "pulse_cognitive_limits",
  "pulse_simulations",
  "pulse_improvements",
  "pulse_constraints",
  "pulse_constraint_violations",
  "pulse_goals",
  "pulse_trajectories",
  "pulse_life_events",
  "pulse_domain_connections",
  "pulse_confidence_events",
  "pulse_user_autonomy",
  "pulse_confidence_calibration",
  "pulse_autonomy_levels",
];

// Tables that are global (not user-scoped)
export const GLOBAL_TABLES = [
  "pulse_constraints",
  "pulse_autonomy_levels",
];

// Maximum rows per query
export const MAX_QUERY_LIMIT = 200;

// Get safe columns for a table
export function getSafeColumns(table: string): string[] | null {
  const tableSchema = OMEGA_SCHEMA.tables[table] || OMEGA_SCHEMA.views[table];
  if (!tableSchema) return null;
  return tableSchema.safeColumns;
}

// Check if a table is global (not user-scoped)
export function isGlobalTable(table: string): boolean {
  return GLOBAL_TABLES.includes(table);
}

// Validate columns against safeColumns
export function validateColumns(table: string, columns: string[]): { valid: boolean; invalid: string[] } {
  const safeColumns = getSafeColumns(table);
  if (!safeColumns) return { valid: false, invalid: columns };

  const invalid = columns.filter(col => !safeColumns.includes(col));
  return { valid: invalid.length === 0, invalid };
}

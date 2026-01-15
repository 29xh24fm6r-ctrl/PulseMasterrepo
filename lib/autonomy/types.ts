
/**
 * Pulse Autonomy Types
 * ====================
 * 
 * Defines the strict levels and domains for Phase 11 Constrained Autonomy.
 */

export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export const AUTONOMY_LEVELS_ORDER: AutonomyLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4'];

export type AutonomyDomain =
    | 'memory_maintenance'
    | 'context_refresh'
    | 'task_preparation'
    | 'followup_drafting'
    | 'schedule_proposal'
    | 'general'; // Fallback

export interface AutonomyDecision {
    allowed: boolean;
    level: AutonomyLevel; // The level this decision IS VALID for
    constraints: string[];
    reason: string;
}

export interface AutonomyConfig {
    domain: AutonomyDomain;
    max_level: AutonomyLevel;
    confidence_threshold: number;
}


/**
 * Pulse Learning Engine Types
 * ===========================
 * 
 * Defines the structures for catching feedback and turning it into bounded learning.
 */

export type UserResponse = 'accepted' | 'rejected' | 'modified' | 'ignored';

export interface FeedbackEvent {
    eventId: string; // ID of the autonomy_event
    ownerUserId: string;
    domain: string;
    response: UserResponse;
    latencyMs?: number;
    overrideReason?: string; // If modified/rejected
}

export interface LearningArtifact {
    id: string;
    pattern: string;
    confidenceDelta: number; // e.g. +0.05
    trustDelta: number; // e.g. +0.01 (Bounded)
    timingShift?: {
        shiftHours: number; // e.g. -1 (Earlier), +2 (Later)
    };
    suppressionRule?: boolean; // If true, we stop asking temporarily
    createdAt: string;
}

export const SCORING_MATRIX: Record<UserResponse, number> = {
    'accepted': 1.0,
    'modified': 0.5,
    'ignored': -0.2,
    'rejected': -1.0
};

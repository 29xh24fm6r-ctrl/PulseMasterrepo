import { DecisionIntent } from '../brain/types';

/**
 * Pulse Canon Invariants (Phase 10.5)
 * ===================================
 * 
 * These assertions MUST be called before any side-effect execution.
 * They are the "Final Gate" for the Pulse Brain.
 */

// Hardcoded Canon Version - must match types
const CURRENT_CANON_VERSION = "brain-v1.0";

export class CanonViolationError extends Error {
    constructor(message: string) {
        super(`[CANON VIOLATION] ${message}`);
        this.name = 'CanonViolationError';
    }
}

/**
 * Asserts that a DecisionIntent is present and mapped to a valid ID.
 */
export function assertDecisionIntentPresent(context: { decision_intent_id?: string }) {
    if (!context.decision_intent_id) {
        throw new CanonViolationError("Action attempted without DecisionIntent ID.");
    }
}

/**
 * Asserts that the DecisionIntent passed the Meta-Cognition Layer.
 */
export function assertMetaVerified(intent: DecisionIntent) {
    if (intent.meta_verified !== true) {
        throw new CanonViolationError("DecisionIntent was NOT verified by Meta-Cognition Layer.");
    }

    if (intent.canon_version !== CURRENT_CANON_VERSION) {
        throw new CanonViolationError(`Canon Version Mismatch: Expected ${CURRENT_CANON_VERSION}, got ${intent.canon_version}`);
    }
}

/**
 * Asserts that the artifact belongs to the active user (Owner Scope).
 * Prevents cross-user data leakage.
 */
export function assertOwnerScope(authenticatedUserId: string, resourceOwnerId: string) {
    if (authenticatedUserId !== resourceOwnerId) {
        throw new CanonViolationError(`Owner Scope Violation: AuthUser ${authenticatedUserId} != ResourceOwner ${resourceOwnerId}`);
    }
}

/**
 * Validates the Integrity Hash of the decision chain.
 * (Simple implementation for MVP, extensible for crypto-signing)
 */
export function validateTrustHash(intent: DecisionIntent, computedHash: string) {
    if (!intent.trust_hash) {
        throw new CanonViolationError("DecisionIntent missing Trust Hash.");
    }
    if (intent.trust_hash !== computedHash) {
        throw new CanonViolationError("Trust Hash Mismatch! Potential Intent Mutation detected.");
    }
}

/**
 * Asserts that no side effects occurred directly from the Model.
 * (This is primarily a static analysis rule, but can have runtime hooks)
 */
export function assertNoModelSideEffects() {
    // Runtime placeholder for "Am I inside a Model Service?" check
    // In a full implementation, we might check stack trace or context flags
    return true;
}

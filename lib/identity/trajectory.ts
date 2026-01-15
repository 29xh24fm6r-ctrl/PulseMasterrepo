
/**
 * Pulse Identity Trajectory Engine
 * lib/identity/trajectory.ts
 * 
 * Tracks the "Momentum" of identity—are we moving towards or away from the Ideal Self?
 */

import { IdentityState, ArchetypeId, ValueId } from './types';

// ============================================
// TYPES
// ============================================

export interface TrajectoryVector {
    direction: 'ascending' | 'descending' | 'flat';
    velocity: number; // 0-100 (Rate of change)
    momentum: number; // 0-100 (Mass * Velocity equivalent)
    primaryDriver: ArchetypeId | 'mixed';
}

export interface IdentityDelta {
    archetypeDeltas: Record<ArchetypeId, number>;
    valueDeltas: Record<ValueId, number>;
    vector: TrajectoryVector;
}

// ============================================
// LOGIC
// ============================================

/**
 * Calculates the trajectory vector based on recent history
 * (In a real implementation, this would query historical snapshots)
 */
export function calculateTrajectory(currentState: IdentityState, previousState?: IdentityState): TrajectoryVector {
    // If no history, assume flat start or calculate based on current momentum if available
    if (!previousState) {
        // Fallback: Use current streak and recent actions as proxy for velocity
        const velocity = Math.min(currentState.streakDays * 10, 100);
        return {
            direction: velocity > 0 ? 'ascending' : 'flat',
            velocity,
            momentum: Math.min(currentState.totalIdentityActions * 2, 100),
            primaryDriver: currentState.activeArchetype || 'mixed'
        };
    }

    // 1. Calculate Aggregate Resonance Change
    // We sum the deltas of all archetypes to see net identity movement
    let totalDelta = 0;
    let maxPOSITIVE_Delta = 0;
    let primaryDriver: ArchetypeId | 'mixed' = 'mixed';

    for (const [id, res] of Object.entries(currentState.resonance)) {
        const archId = id as ArchetypeId;
        const prevRes = previousState.resonance[archId]?.current || 0;
        const delta = res.current - prevRes;

        totalDelta += delta;

        if (delta > maxPOSITIVE_Delta) {
            maxPOSITIVE_Delta = delta;
            primaryDriver = archId;
        }
    }

    // 2. Determine Direction
    // Threshold for "ascending" is net positive growth
    let direction: 'ascending' | 'descending' | 'flat' = 'flat';
    if (totalDelta > 5) direction = 'ascending';
    else if (totalDelta < -5) direction = 'descending';

    // 3. Calculate Velocity (Rate of Change)
    // Normalized: 100 points of resonance growth = 100 velocity (capped)
    const velocity = Math.min(Math.abs(totalDelta), 100);

    // 4. Calculate Momentum (Mass * Velocity)
    // Mass = Total Accumulated Resonance / 10
    // This means it's harder to stop a "heavy" identity from moving, but also harder to get it moving.
    const totalResonance = Object.values(currentState.resonance).reduce((sum, r) => sum + r.current, 0);
    const mass = Math.max(1, totalResonance / 100);

    // For our purposes, we want a momentum score 0-100.
    // Let's define it as a function of Streak (Consistency) + Velocity (Intensity)
    const momentum = Math.min((currentState.streakDays * 5) + velocity, 100);

    return {
        direction,
        velocity,
        momentum,
        primaryDriver: direction === 'ascending' ? primaryDriver : 'mixed'
    };
}

/**
 * Projects where the identity is heading if current behavior continues
 */
export function projectFutureSelf(current: IdentityState, vector: TrajectoryVector): string[] {
    const projections: string[] = [];

    if (vector.direction === 'ascending') {
        projections.push("Identity gravity is increasing. Habits are becoming automatic.");
        if (vector.primaryDriver !== 'mixed') {
            projections.push(`Strong alignment with ${vector.primaryDriver} archetype.`);
        }
    } else if (vector.direction === 'descending') {
        projections.push("Identity entropy detected. Re-anchoring required.");
    }

    return projections;
}

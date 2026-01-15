/**
 * Pulse Momentum Projection Engine
 * lib/momentum/projection.ts
 */

import { supabaseAdmin } from "../supabase";


// ============================================
// TYPES
// ============================================

export interface MomentumSnapshot {
    owner_user_id: string;
    total_score: number;
    active_domains: string[]; // e.g. ['health', 'finance']
    dominant_trend: 'up' | 'down' | 'flat';
    last_activity: string; // ISO date
    recent_events: MomentumEvent[];
}

export interface MomentumEvent {
    domain: string;
    signal: string;
    weight: number;
    occurred_at: string;
}

export interface MomentumDelta {
    vector: number; // Projected change in score (+10, -5, 0)
    direction: 'aligned' | 'opposed' | 'neutral'; // Relation to Identity
    confidence: number;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Fetches the current momentum state for a user.
 * Aggregates data from `momentum_snapshots` and `momentum_events`.
 */
export async function getCurrentMomentum(owner_user_id: string): Promise<MomentumSnapshot> {
    // MOCK MODE: Bypass DB to verify Simulation Logic first because of persistent TransformError

    // Mock Data mimicking DB response
    const snapshots = [
        { score: 50, streak_current: 5, domain_slug: 'core-vitality', trend: 'up' as const, last_activity_at: new Date().toISOString() }
    ];

    const events = [
        { domain_slug: 'core-vitality', signal_type: 'workout', weight: 1, occurred_at: new Date().toISOString() }
    ];

    const totalScore = snapshots.reduce((acc, s) => acc + s.score, 0);
    const activeDomains = snapshots.filter(s => s.streak_current > 0).map(s => s.domain_slug);

    return {
        owner_user_id,
        total_score: totalScore,
        active_domains: activeDomains,
        dominant_trend: 'up',
        last_activity: snapshots[0].last_activity_at,
        recent_events: events.map(e => ({
            domain: e.domain_slug,
            signal: e.signal_type,
            weight: e.weight,
            occurred_at: e.occurred_at
        }))
    };
}

/**
 * Projects the "Do Nothing" baseline.
 * If user does nothing, momentum usually decays.
 */
export function projectBaselineMomentum(snapshot: MomentumSnapshot): { trend: 'up' | 'down' | 'flat'; description: string } {
    if (snapshot.dominant_trend === 'down') {
        return {
            trend: 'down',
            description: "Existing entropy will accelerate. Momentum loss expected."
        };
    }
    if (snapshot.dominant_trend === 'up') {
        // Momentum carries forward briefly even without action
        return {
            trend: 'flat',
            description: "Upward momentum will plateau without new input."
        };
    }
    return {
        trend: 'flat',
        description: "Stasis. No significant change expected."
    };
}

/**
 * Estimates the delta of a proposed intent.
 * This is a heuristic function, later enriched by AI.
 */
export function estimateIntentDelta(
    intentTitle: string,
    snapshot: MomentumSnapshot
): MomentumDelta {
    // Simple Heuristics for Phase 9 MVP
    const lowerTitle = intentTitle.toLowerCase();

    if (lowerTitle.includes('finish') || lowerTitle.includes('complete') || lowerTitle.includes('ship')) {
        return { vector: 10, direction: 'aligned', confidence: 0.9 };
    }

    if (lowerTitle.includes('start') || lowerTitle.includes('plan')) {
        return { vector: 5, direction: 'aligned', confidence: 0.7 };
    }

    if (lowerTitle.includes('cancel') || lowerTitle.includes('ignore')) {
        return { vector: -2, direction: 'opposed', confidence: 0.6 };
    }

    // Default neutral
    return { vector: 0, direction: 'neutral', confidence: 0.5 };
}

function createEmptySnapshot(userId: string): MomentumSnapshot {
    return {
        owner_user_id: userId,
        total_score: 0,
        active_domains: [],
        dominant_trend: 'flat',
        last_activity: new Date().toISOString(),
        recent_events: []
    };
}

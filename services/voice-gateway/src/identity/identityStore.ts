import { IdentitySignal, IdentityVector } from './identityTypes.js';

export class IdentityStore {
    private signals: Map<string, IdentitySignal> = new Map();
    private vector: IdentityVector | null = null;

    // In-memory strictly for Phase 8. Future: Supabase.

    addSignal(signal: IdentitySignal): void {
        this.signals.set(signal.signal_id, signal);
        this.recalculateVector();
    }

    getVector(): IdentityVector | null {
        return this.vector;
    }

    getSignals(): IdentitySignal[] {
        return Array.from(this.signals.values());
    }

    /**
     * Derives the Identity Vector from current signals.
     * Simple aggregation logic for Phase 8.
     */
    private recalculateVector(): void {
        const signals = Array.from(this.signals.values());

        // Simple aggregation for proof of concept
        const values = signals.filter(s => s.category === 'value').map(s => s.description);
        const conflicts = signals.filter(s => s.category === 'stress_response').map(s => s.description);
        const stable = signals.filter(s => s.confidence > 0.8 && getAgeInDays(s.first_observed_at) > 7).map(s => s.description);
        const volatile = signals.filter(s => s.confidence < 0.8 || getAgeInDays(s.first_observed_at) <= 7).map(s => s.description);

        this.vector = {
            vector_version: (this.vector?.vector_version || 0) + 1,
            dominant_values: values,
            recurring_conflicts: conflicts,
            stable_traits: stable,
            volatile_traits: volatile,
            confidence: this.calculateOverallConfidence(signals),
            last_updated_at: new Date().toISOString()
        };
    }

    private calculateOverallConfidence(signals: IdentitySignal[]): number {
        if (signals.length === 0) return 0;
        const sum = signals.reduce((acc, s) => acc + s.confidence, 0);
        return sum / signals.length;
    }
}

function getAgeInDays(dateStr: string): number {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff / (1000 * 60 * 60 * 24);
}

export const identityStore = new IdentityStore();

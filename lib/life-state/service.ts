import { createClient } from '@/lib/supabase/server'; // Assuming this exists or similar
import { LifeStateSnapshot, SignalVector } from './types';

// Placeholder factors - in a real implementation these would query their respective domains
const BASE_MOMENTUM = 75;
const BASE_ENERGY = 60;

export class LifeStateService {

    /**
     * Main aggregator function.
     * Pulls data from Finance, Calendar, Tasks, Habits to compute the master state.
     */
    async calculateCurrentState(userId: string): Promise<LifeStateSnapshot> {

        // 1. Gather Raw Signals (Parallel)
        const [finance, time, habits] = await Promise.all([
            this.getFinanceSignals(userId),
            this.getTimeSignals(userId),
            this.getHabitSignals(userId),
        ]);

        // 2. Compute Core Metrics
        const momentum = this.computeMomentum(habits, time);
        const energy = this.computeEnergy(habits, time);
        const finPressure = this.computeFinancialPressure(finance);
        const timePressure = this.computeTimePressure(time);

        // 3. Derive Vectors
        const riskVectors: SignalVector[] = [];
        const oppVectors: SignalVector[] = [];

        if (finPressure > 0.8) {
            riskVectors.push({
                id: 'fin-strain', type: 'RISK', domain: 'FINANCE', severity: 8,
                message: 'Financial pressure approaching critical limit', actionable: true
            });
        }

        if (momentum > 90) {
            oppVectors.push({
                id: 'flow-state', type: 'OPPORTUNITY', domain: 'MOMENTUM', severity: 9,
                message: 'High momentum detected. Perfect time to tackle backlog.', actionable: true
            });
        }

        const snapshot: LifeStateSnapshot = {
            captured_at: new Date().toISOString(),
            momentum_score: momentum,
            energy_level: energy,
            financial_pressure: finPressure,
            time_pressure: timePressure,
            stress_index: (finPressure + timePressure) / 2, // Simple AVG for now
            confidence_level: Math.round((momentum + energy) / 2),
            risk_vectors: riskVectors,
            opportunity_vectors: oppVectors,
            raw_signals: { finance, time, habits }
        };

        return snapshot;
    }

    /**
     * Persists the calculated state to the database (Canonical Truth).
     */
    async captureState(userId: string, userIdUuid: string): Promise<void> {
        const state = await this.calculateCurrentState(userId);
        const supabase = await createClient();

        const { error } = await supabase.from('life_state').insert({
            user_id: userId,
            user_id_uuid: userIdUuid,
            momentum_score: state.momentum_score,
            energy_level: state.energy_level,
            financial_pressure: state.financial_pressure,
            time_pressure: state.time_pressure,
            stress_index: state.stress_index,
            confidence_level: state.confidence_level,
            risk_vectors: state.risk_vectors as any,
            opportunity_vectors: state.opportunity_vectors as any,
            raw_signals: state.raw_signals as any
        });

        if (error) {
            console.error('Failed to capture LifeState:', error);
            throw error;
        }
    }

    // --- Private Helpers (Stubs for Phase 13) ---

    private async getFinanceSignals(userId: string) {
        // TODO: Connect to Real Finance Service
        return {
            burnRate: 1.1, // Spending 10% more than income
            upcomingBills: 4,
            liquidity: 'OK'
        };
    }

    private async getTimeSignals(userId: string) {
        // TODO: Connect to Calendar/Tasks
        return {
            meetingLoad: 0.4, // 40% of day
            overdueTasks: 2,
            deepWorkSlots: 1
        };
    }

    private async getHabitSignals(userId: string) {
        // TODO: Connect to Habits
        return {
            streakDays: 4,
            missedCore: ['Meditation']
        };
    }

    private computeMomentum(habits: any, time: any): number {
        let score = BASE_MOMENTUM;
        if (habits.streakDays > 3) score += 10;
        if (time.overdueTasks === 0) score += 5;
        return Math.min(100, Math.max(0, score));
    }

    private computeEnergy(habits: any, time: any): number {
        let score = BASE_ENERGY;
        if (time.meetingLoad > 0.6) score -= 15; // Heavy meetings drain energy
        if (habits.missedCore.includes('Meditation')) score -= 5;
        return Math.min(100, Math.max(0, score));
    }

    private computeFinancialPressure(finance: any): number {
        // Normalized 0.0 to 1.0
        if (finance.burnRate > 1.0) return 0.8;
        return 0.3;
    }

    private computeTimePressure(time: any): number {
        // Normalized 0.0 to 1.0
        return time.meetingLoad + (time.overdueTasks * 0.05);
    }

}

export const lifeStateService = new LifeStateService();

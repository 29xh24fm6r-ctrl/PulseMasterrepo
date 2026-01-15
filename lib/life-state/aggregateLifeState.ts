import { LifeState } from "./types";
import { RiskVector, OpportunityVector } from './vectors';
import { getFinanceSnapshot } from "@/lib/finance/getFinanceSnapshot";
import { mapFinancePressure, financeRiskVectors } from "./mapFinanceToLifeState";

// Mock other signals for now until their specific wiring tasks
async function getTimeSignals(userId: string) { return { pressure: 0.8 }; }
async function getHabitSignals(userId: string) { return { completion_rate: 0.6 }; }
async function getEnergySignals(userId: string) { return { level: 0.5 }; }

export async function aggregateLifeState(userId: string): Promise<LifeState> {
    // 1. Parallel Fetch of Signals
    // Finance is now REAL. Others are mocked.
    const [finance, time, habits, energy] = await Promise.all([
        getFinanceSnapshot(userId),
        getTimeSignals(userId),
        getHabitSignals(userId),
        getEnergySignals(userId),
    ]);

    // 2. Compute Core Pressures
    // Finance pressure is derived from real snapshot data
    const financial_pressure = mapFinancePressure(finance);
    const time_pressure = time.pressure;

    // 3. Compute Energy & Momentum
    const energy_level = energy.level;

    // Momentum: (Habits + (1 - FinancePressure)) / 2
    // If finance is crushing you, momentum stalls.
    const momentum_base = (habits.completion_rate + (1 - financial_pressure)) / 2;
    const momentum_score = Math.max(-1, Math.min(1, (momentum_base - 0.5) * 2)); // Normalize to -1..1

    // 4. Compute Derived Metrics
    // Stress = max(finance, time) * (1 - energy)
    const stress_index = Math.max(financial_pressure, time_pressure) * (1 - energy_level * 0.5);

    // Confidence = Momentum * (1 - Stress)
    const confidence_level = Math.max(0, momentum_score * (1 - stress_index));

    // 5. Generate Vectors
    // Start with Finance vectors (Real)
    const risk_vectors: RiskVector[] = [
        ...financeRiskVectors(finance)
    ];

    const opportunity_vectors: OpportunityVector[] = [];

    // Mock generic vectors for other domains to keep UI populated
    if (time_pressure > 0.8) {
        risk_vectors.push({
            domain: 'time',
            severity: 0.8,
            horizon_days: 2,
            explanation: 'Schedule density critical. Reject incoming requests.'
        });
    }

    if (momentum_score > 0.4) {
        opportunity_vectors.push({
            domain: 'growth',
            magnitude: 0.7,
            window_days: 5,
            explanation: 'Momentum favorable for high-leverage initiation.'
        });
    }

    // 6. Return Canonical State
    return {
        id: `state_${Date.now()}`,
        user_id: userId,
        updated_at: finance.updated_at, // Sync with finance update

        financial_pressure,
        time_pressure,
        effort_load: 0.6, // placeholder

        energy_level,
        momentum_score,
        stress_index,
        confidence_level,

        risk_vectors,
        opportunity_vectors,

        // Phase 13: Expose Finance Telemetry for UI
        finance_telemetry: {
            runway_days: finance.runway_days,
            spend_trend: finance.spend_trend_7d_vs_30d,
            anomalies: finance.anomaly_count_14d
        }
    };
}

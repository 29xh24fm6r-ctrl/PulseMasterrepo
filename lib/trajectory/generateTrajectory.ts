import { LifeState } from "@/lib/life-state/types";
import { TrajectoryLine, TrajectoryHorizonDays } from "./types";

/**
 * Server-Only Logic to forecast specific future horizons (7/14/30d).
 * Canon Rules:
 * 1. INFORMATIONAL ONLY. No "should", "must", "recommend".
 * 2. Confidence specific. If unsure, do not generate.
 * 3. Max window is 30 days.
 */
export function generateTrajectory(
    current: LifeState,
    history: LifeState[] = [] // Optional for momentum delta
): TrajectoryLine[] {
    const lines: TrajectoryLine[] = [];
    const {
        financial_pressure,
        time_pressure,
        stress_index,
        momentum_score,
        energy_level,
        finance_telemetry
    } = current;

    // 1. Finance Trajectory (Tightening/Loosening)
    // If pressure > 0.6 or spend trend > 1.2 -> Forecast tightening
    if (financial_pressure > 0.6 || (finance_telemetry?.spend_trend || 0) > 1.15) {
        const confidence = Math.min(0.9, (finance_telemetry?.spend_trend || 1) * 0.7);
        if (confidence > 0.5) {
            lines.push({
                horizon_days: 14,
                headline: "If current burn holds, financial pressure tightens within ~14 days.",
                confidence: parseFloat(confidence.toFixed(2)),
                drivers: ["High Velocity", "Runway Compression"],
                updated_at: new Date().toISOString()
            });
        }
    }

    // 2. Burnout Trajectory (Energy vs Time)
    // High time pressure + low energy -> Burnout risk
    if (time_pressure > 0.75 && energy_level < 0.4) {
        lines.push({
            horizon_days: 7,
            headline: "Energy trajectory suggests exhaustion risk if schedule density persists.",
            confidence: 0.85,
            drivers: ["Time Scarcity", "Low Reserves"],
            updated_at: new Date().toISOString()
        });
    }

    // 3. Instability Trajectory (Momentum vs Stress)
    // Falling momentum + High stress
    if (momentum_score < 0.2 && stress_index > 0.7) {
        lines.push({
            horizon_days: 7,
            headline: "Operational stability is degrading; variance likely to increase.",
            confidence: 0.8,
            drivers: ["Stress Spike", "Stalled Momentum"],
            updated_at: new Date().toISOString()
        });
    }

    // 4. Recovery Trajectory (Positive)
    // Rising energy + Low stress + Good momentum
    // Note: Momentum is -1 to 1 based on previous fixes.
    if (energy_level > 0.6 && stress_index < 0.4 && momentum_score > 0.3) {
        lines.push({
            horizon_days: 30,
            headline: "Capacity is expanding; foundational stability is returning.",
            confidence: 0.75,
            drivers: ["Deep Rest", "Consistent Flow"],
            updated_at: new Date().toISOString()
        });
    }

    // 5. Filter & Clamp
    // Max 2 lines, sorted by confidence
    return lines
        .filter(l => l.confidence >= 0.5)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 2);
}

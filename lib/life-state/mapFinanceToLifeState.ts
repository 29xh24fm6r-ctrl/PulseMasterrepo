import { FinanceSnapshot } from "@/lib/finance/types";
import { RiskVector } from "@/lib/life-state/vectors";

export function mapFinancePressure(fin: FinanceSnapshot): number {
    // Pressure increases as runway decreases or spend accelerates.
    // Clamp strictly 0–1.
    let runwayPressure = 0.3; // neutral default

    if (fin.runway_days !== null) {
        if (fin.runway_days <= 14) runwayPressure = 1.0;
        else if (fin.runway_days <= 30) runwayPressure = 0.85;
        else if (fin.runway_days <= 60) runwayPressure = 0.65;
        else if (fin.runway_days <= 120) runwayPressure = 0.45;
        else runwayPressure = 0.25;
    }

    const accel = Math.max(0, fin.spend_trend_7d_vs_30d - 1); // e.g. 0.2
    const accelPressure = Math.min(1, accel * 2); // scale

    const anomalyPressure = Math.min(1, fin.anomaly_count_14d / 10);

    const combined = 0.65 * runwayPressure + 0.25 * accelPressure + 0.10 * anomalyPressure;
    return Math.max(0, Math.min(1, combined));
}

export function financeRiskVectors(fin: FinanceSnapshot): RiskVector[] {
    const vectors: RiskVector[] = [];

    if (fin.runway_days !== null && fin.runway_days <= 60) {
        vectors.push({
            domain: "finance",
            severity: fin.runway_days <= 14 ? 1 : fin.runway_days <= 30 ? 0.85 : 0.65,
            horizon_days: fin.runway_days,
            explanation: `Runway tightening: ~${Math.round(fin.runway_days)} days at current burn.`,
        });
    }

    if (fin.spend_trend_7d_vs_30d >= 1.25) {
        vectors.push({
            domain: "finance",
            severity: Math.min(1, (fin.spend_trend_7d_vs_30d - 1) * 1.5),
            horizon_days: 14,
            explanation: `Spend accelerating vs baseline (7d/30d: ${(fin.spend_trend_7d_vs_30d).toFixed(2)}x).`,
        });
    }

    if (fin.anomaly_count_14d >= 3) {
        vectors.push({
            domain: "finance",
            severity: Math.min(1, fin.anomaly_count_14d / 10),
            horizon_days: 7,
            explanation: `Unusual activity detected (${fin.anomaly_count_14d} anomalies in 14d).`,
        });
    }

    return vectors;
}

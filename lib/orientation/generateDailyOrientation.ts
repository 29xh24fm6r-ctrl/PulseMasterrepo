import { LifeState } from "@/lib/life-state/types";
import { DailyOrientation, DailyOrientationState, OrientationFeedback } from "./types";

/**
 * Server-Only Logic to distill LifeState into a single Daily Orientation.
 * This acts as the "Lens" for the user's day.
 */
export function generateDailyOrientation(
    current: LifeState,
    previous?: LifeState | null,
    feedbackHistory: OrientationFeedback[] = [] // Learning Input
): DailyOrientation {
    const { stress_index, financial_pressure, time_pressure, energy_level, momentum_score, finance_telemetry } = current;

    // Calibration: Calculate Sensitivity
    // "Off" feedback makes the system more conservative (higher confidence needed to leave 'stable').
    // "Accurate" feedback allows normal operation.
    const recentOffs = feedbackHistory.filter(f => f.feedback === 'off').length;

    // If user rejected 2+ times recently, we clamp down.
    // Base threshold adjustment: +0.05 per rejection, capped at +0.15
    const thresholdPenalty = Math.min(0.15, recentOffs * 0.05);

    // 1. Determine Candidate State
    let candidateState: DailyOrientationState = 'stable';
    let primaryReason = "System functioning within normal parameters.";
    let secondaryFactors: string[] = [];
    let confidence = 0.8; // Baseline confidence

    // Heavy: High stress overlapping with other pressures
    // Base threshold 0.75 becomes 0.75 + penalty
    if (stress_index > (0.75 + thresholdPenalty)) {
        candidateState = 'heavy';
        primaryReason = "System load is exceeding comfortable thresholds.";
        confidence = 0.9;

        if (financial_pressure > 0.7) secondaryFactors.push("Financial compression");
        if (time_pressure > 0.7) secondaryFactors.push("Schedule density");
    }
    // Tightening: Finance or Time pressure rising specifically
    else if (financial_pressure > (0.6 + thresholdPenalty) || (finance_telemetry?.spend_trend || 0) > 1.2) {
        candidateState = 'tightening';
        primaryReason = "Resource consumption is accelerating against fixed constraints.";
        secondaryFactors.push("Elevated burn rate");
    }
    else if (time_pressure > (0.8 + thresholdPenalty)) {
        candidateState = 'tightening';
        primaryReason = "Time scarcity is restricting operational freedom.";
    }
    // Volatile: High anomalies or erratic momentum
    else if ((finance_telemetry?.anomalies || 0) > 2 || (previous && Math.abs(current.momentum_score - previous.momentum_score) > (0.5 + thresholdPenalty))) {
        candidateState = 'volatile';
        primaryReason = "Unusual variance detected in core signals.";
        secondaryFactors.push("Multiple anomalies detected");
    }
    // Recovering: Good energy + low stress + positive trend
    // Note: Positive states (Recovering) might NOT want to be suppressed by "Off" feedback unless the user explicitly wants less noise.
    // For now, we apply the penalty symmetrically to avoid "false cheer".
    else if (energy_level > (0.7 + thresholdPenalty) && stress_index < 0.4 && momentum_score > 0.3) {
        candidateState = 'recovering';
        primaryReason = "Energy reserves are replenishing; capacity is returning.";
        confidence = 0.75;
    }
    // Stable (Default)
    else {
        candidateState = 'stable';
        primaryReason = "Operations are steady with no critical vectors.";
        confidence = 0.95;
    }

    // 2. Confidence Flooring (Trust System)
    // If we aren't sure, we don't alarm.
    // In this deterministic logic, confidence is mostly rule-based, but we clamp it here.
    // E.g., if missing data, confidence drops.
    if (!finance_telemetry) {
        confidence -= 0.2;
    }

    // If recent feedback was "Off", we require higher confidence to show non-stable states.
    const confidenceFloor = 0.4 + (recentOffs * 0.1);

    if (confidence < confidenceFloor) {
        candidateState = 'stable';
        primaryReason = "Analyzing data streams for coherence."; // Soft fallback
        secondaryFactors = [];
    }

    // 3. Narrative Construction (Sentence Polish)
    // Ensure the primary reason is a complete sentence.
    // (In a real NLP version, this would be generated. Here we use templates.)
    if (recentOffs > 0 && candidateState === 'heavy') {
        primaryReason = "High load detected, but stability remains prioritized."; // Softer
    }

    return {
        date: new Date().toISOString().split('T')[0],
        dominant_state: candidateState,
        primary_reason: primaryReason,
        secondary_factors: secondaryFactors,
        confidence,
        changed_since_yesterday: previous ? candidateState !== 'stable' : false // simplified check
    };
}

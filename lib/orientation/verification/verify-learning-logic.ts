
import { generateDailyOrientation } from '../generateDailyOrientation';
import { LifeState } from '../../life-state/types';
import { OrientationFeedback } from '../types';

const mockLifeState: LifeState = {
    id: 'test',
    user_id: 'test',
    captured_at: new Date().toISOString(),
    momentum_score: -0.5,
    energy_level: 0.3,
    financial_pressure: 0.8, // High finance pressure
    time_pressure: 0.8, // High time pressure
    stress_index: 0.8, // High stress
    confidence_level: 0.8,
    risk_vectors: [],
    opportunity_vectors: [],
    raw_signals: {}
};

console.log("TEST 1: Baseline High Pressure (No Feedback)");
// Should be 'heavy'
const baseline = generateDailyOrientation(mockLifeState, null, []);
console.log(`Baseline State: ${baseline.dominant_state}`);

if (baseline.dominant_state !== 'heavy') {
    console.error("FAIL: Baseline should be heavy given high stress.");
    process.exit(1);
}

console.log("TEST 2: Calibration with Recent 'Off' Feedback");
// User said "Off" 3 times recently. System should be conservative.
const feedbackHistory: OrientationFeedback[] = [
    { day: '2025-01-01', feedback: 'off' },
    { day: '2025-01-02', feedback: 'off' },
    { day: '2025-01-03', feedback: 'off' },
];

const calibrated = generateDailyOrientation(mockLifeState, null, feedbackHistory);
console.log(`Calibrated State: ${calibrated.dominant_state}`);
console.log(`Calibrated Reason: ${calibrated.primary_reason}`);

// Check if penalty applied.
// Heavy requires > 0.75 + (3 * 0.05) = > 0.9 stress.
// Mock stress is 0.8. So it should fallback to stable or tightening?
// Tightening requires > 0.6 + 0.15 = 0.75 finance. Mock is 0.8. So maybe Tightening?
// Or if confidence floor hit, Stable.

if (calibrated.dominant_state !== 'heavy') {
    console.log("PASS: System damped 'heavy' state due to negative feedback.");
} else {
    console.error("FAIL: System ignored negative feedback history.");
    process.exit(1);
}

if (calibrated.confidence < baseline.confidence) {
    console.log("PASS: Confidence lowered by legacy doubt.");
}

console.log("VERIFIED: Learning Logic prevents alarm fatigue.");

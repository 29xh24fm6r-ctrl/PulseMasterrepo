
import { generateDailyOrientation } from '../generateDailyOrientation';
import { LifeState } from '../../life-state/types';

const mockLifeState: LifeState = {
    id: 'test',
    user_id: 'test',
    captured_at: new Date().toISOString(),
    momentum_score: 0.5,
    energy_level: 0.5,
    financial_pressure: 0.2, // Low
    time_pressure: 0.2, // Low
    stress_index: 0.2, // Low
    confidence_level: 80,
    risk_vectors: [],
    opportunity_vectors: [],
    raw_signals: {}
};

// 1. Verify Low Confidence Clamping
console.log("Testing Confidence Clamping...");
const lowConfState = { ...mockLifeState, finance_telemetry: undefined }; // Triggers confidence penalty
const result = generateDailyOrientation(lowConfState, null);

if (result.confidence < 0.9 && result.dominant_state === 'stable') {
    console.log("PASS: Confidence Penalty Applied & State Clamped to Stable.");
} else {
    console.error("FAIL: Confidence Logic Check", result);
    process.exit(1);
}

// 2. Verify Heavy State Logic
console.log("Testing Heavy State Logic...");
const heavyState = { ...mockLifeState, stress_index: 0.9, financial_pressure: 0.8 };
const heavyResult = generateDailyOrientation(heavyState, null);

if (heavyResult.dominant_state === 'heavy') {
    console.log("PASS: Heavy State Detected correctly.");
} else {
    console.error("FAIL: Heavy State Logic", heavyResult);
    process.exit(1);
}

console.log("VERIFIED: Orientation Logic is sound.");

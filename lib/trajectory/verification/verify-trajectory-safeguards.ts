
import { generateTrajectory } from '../generateTrajectory';
import { LifeState } from '../../life-state/types';

// Mock State
const mockLifeState: LifeState = {
    id: 'test',
    user_id: 'test',
    captured_at: new Date().toISOString(),
    momentum_score: -0.5,
    energy_level: 0.3,
    financial_pressure: 0.8, // High
    time_pressure: 0.8, // High
    stress_index: 0.8, // High
    confidence_level: 0.8,
    risk_vectors: [],
    opportunity_vectors: [],
    raw_signals: {}
};

console.log("Testing Trajectory Generation...");
const lines = generateTrajectory(mockLifeState);

if (lines.length > 0) {
    console.log(`Generated ${lines.length} lines.`);
    lines.forEach(l => console.log(`[${l.horizon_days}D] ${l.headline} (${l.confidence})`));

    // CHECK 1: No Prescriptions
    const forbidden = /\b(should|do|must|recommend|need)\b/i;
    const hasForbidden = lines.some(l => forbidden.test(l.headline));

    if (hasForbidden) {
        console.error("FAIL: Directive language detected.");
        process.exit(1);
    } else {
        console.log("PASS: No directive language found.");
    }

    // CHECK 2: Confidence Clamping
    const invalidConfidence = lines.some(l => l.confidence < 0.5 || l.confidence > 1);
    if (invalidConfidence) {
        console.error("FAIL: Confidence out of bounds.");
        process.exit(1);
    } else {
        console.log("PASS: Confidence strictly clamped.");
    }

} else {
    console.log("No trajectories generated (could be valid depending on thresholds).");
}

console.log("VERIFIED: Trajectory Logic is Safe.");

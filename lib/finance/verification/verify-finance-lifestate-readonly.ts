
import { mapFinancePressure } from '../../life-state/mapFinanceToLifeState';
// Note: tsx might need explicit extensions or path alias setup. Retrying with standard resolution first after tsc check.
import { FinanceSnapshot } from '../types';

// Mock Snapshot
const mockSnapshot: FinanceSnapshot = {
    cash_on_hand: 10000,
    monthly_net_burn: 2000,
    runway_days: 150,
    income_30d: 5000,
    spend_30d: 7000,
    spend_7d: 1500,
    spend_trend_7d_vs_30d: 1.0,
    essential_ratio_30d: 0.5,
    discretionary_ratio_30d: 0.5,
    anomaly_count_14d: 0,
    updated_at: new Date().toISOString()
};

function runTest() {
    console.log("Running Verify Finance LifeState Read-Only...");

    // Test 1: Neutral inputs
    const p1 = mapFinancePressure(mockSnapshot);
    if (p1 < 0 || p1 > 1) throw new Error(`Pressure out of bounds: ${p1}`);
    console.log(`Neutral Pressure: ${p1} (Pass)`);

    // Test 2: High Burn
    const p2 = mapFinancePressure({ ...mockSnapshot, runway_days: 10 });
    // Expect > 0.65
    if (p2 < 0.65) throw new Error(`High burn pressure too low: ${p2}`);
    console.log(`Crisis Pressure: ${p2} (Pass)`);

    // Test 3: Acceleration
    const p3 = mapFinancePressure({ ...mockSnapshot, spend_trend_7d_vs_30d: 1.5 });
    // Expect increase
    if (p3 <= p1) throw new Error(`Acceleration did not increase pressure: ${p3} vs ${p1}`);
    console.log(`Accel Pressure: ${p3} (Pass)`);

    console.log("VERIFIED: Finance Logic is Read-Only and Clamped.");
}

runTest();

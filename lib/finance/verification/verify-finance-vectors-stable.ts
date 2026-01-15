
import { financeRiskVectors } from '../../life-state/mapFinanceToLifeState';
import { FinanceSnapshot } from '../types';

const mockSnapshot: FinanceSnapshot = {
    cash_on_hand: 5000,
    monthly_net_burn: 5000,
    runway_days: 30,
    income_30d: 5000,
    spend_30d: 10000,
    spend_7d: 2500,
    spend_trend_7d_vs_30d: 1.3,
    essential_ratio_30d: 0.5,
    discretionary_ratio_30d: 0.5,
    anomaly_count_14d: 4,
    updated_at: new Date().toISOString()
};

function runTest() {
    console.log("Running Verify Finance Vectors Stability...");

    const vectors = financeRiskVectors(mockSnapshot);
    console.log(`Generated ${vectors.length} vectors.`);

    vectors.forEach(v => {
        if (v.severity < 0 || v.severity > 1) throw new Error(`Vector severity out of bounds: ${v.severity}`);
        if (!v.horizon_days || v.horizon_days < 0) throw new Error(`Invalid horizon: ${v.horizon_days}`);
        console.log(`Vector [${v.domain}]: ${v.explanation} (Severity: ${v.severity}) - OK`);
    });

    if (vectors.length < 3) throw new Error("Expected at least 3 vectors for high-risk mock.");

    console.log("VERIFIED: Finance Vectors are Stable and Correct.");
}

runTest();

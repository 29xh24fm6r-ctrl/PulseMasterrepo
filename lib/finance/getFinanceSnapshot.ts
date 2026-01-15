import { createClient } from '@/utils/supabase/server';
import { FinanceSnapshot } from './types';

export async function getFinanceSnapshot(userId: string): Promise<FinanceSnapshot> {
    const supabase = createClient();

    // Fetch last 30 days of rollups
    // Ensure we sort by day descending so index 0 is most recent
    const { data: rollups, error } = await supabase
        .from('finance_daily_rollups')
        .select('*')
        .eq('owner_user_id', userId)
        .order('day', { ascending: false })
        .limit(30);

    if (error || !rollups || rollups.length === 0) {
        // Return safe default if no data
        return {
            cash_on_hand: 0,
            monthly_net_burn: 0,
            runway_days: null,
            income_30d: 0,
            spend_30d: 0,
            spend_7d: 0,
            spend_trend_7d_vs_30d: 1.0,
            essential_ratio_30d: 0,
            discretionary_ratio_30d: 0,
            anomaly_count_14d: 0,
            updated_at: new Date().toISOString()
        };
    }

    // --- Compute Metrics ---

    // 1. Cash on Hand (Latest available)
    // We assume the most recent rollup has the authoritative cash balance snapshot
    const cash_on_hand = Number(rollups[0].cash_on_hand) || 0;

    // 2. 30d Aggregates
    const income_30d = rollups.reduce((sum, r) => sum + Number(r.income), 0);
    const spend_30d = rollups.reduce((sum, r) => sum + Number(r.spend), 0);
    const essentials_30d = rollups.reduce((sum, r) => sum + Number(r.essentials_spend), 0);
    const discretionary_30d = rollups.reduce((sum, r) => sum + Number(r.discretionary_spend), 0);

    const monthly_net_burn = spend_30d - income_30d;

    // 3. Runway
    let runway_days: number | null = null;
    if (monthly_net_burn > 0 && cash_on_hand > 0) {
        runway_days = (cash_on_hand / monthly_net_burn) * 30;
    }

    // 4. Trend (7d vs 30d avg)
    // 7d spend / 7 (daily avg) vs 30d spend / 30 (daily avg)
    // Simplified: (spend_7d * 4.28) / spend_30d ? 
    // Better: Compare Daily Average

    const recent7 = rollups.filter(r => {
        const d = new Date(r.day);
        const ago = new Date();
        ago.setDate(ago.getDate() - 7);
        return d >= ago;
    });

    const spend_7d = recent7.reduce((sum, r) => sum + Number(r.spend), 0);

    const daily_avg_7d = recent7.length > 0 ? spend_7d / recent7.length : 0;
    const daily_avg_30d = rollups.length > 0 ? spend_30d / rollups.length : 0;

    let spend_trend_7d_vs_30d = 1.0;
    if (daily_avg_30d > 0) {
        spend_trend_7d_vs_30d = daily_avg_7d / daily_avg_30d;
    }

    // 5. Ratios
    const essential_ratio_30d = spend_30d > 0 ? essentials_30d / spend_30d : 0;
    const discretionary_ratio_30d = spend_30d > 0 ? discretionary_30d / spend_30d : 0;

    // 6. Anomalies (Last 14 days)
    const recent14 = rollups.slice(0, 14); // valid since sorted desc
    const anomaly_count_14d = recent14.reduce((sum, r) => sum + (r.anomaly_count || 0), 0);

    return {
        cash_on_hand,
        monthly_net_burn,
        runway_days,
        income_30d,
        spend_30d,
        spend_7d,
        spend_trend_7d_vs_30d,
        essential_ratio_30d,
        discretionary_ratio_30d,
        anomaly_count_14d,
        updated_at: new Date().toISOString()
    };
}

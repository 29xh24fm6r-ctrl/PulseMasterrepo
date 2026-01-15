export type FinanceSnapshot = {
    cash_on_hand: number;              // total liquid
    monthly_net_burn: number;          // expenses - income (positive means burn)
    runway_days: number | null;        // null if monthly_net_burn <= 0
    income_30d: number;
    spend_30d: number;
    spend_7d: number;
    spend_trend_7d_vs_30d: number;     // ratio, e.g. 1.2 means accelerating
    essential_ratio_30d: number;       // essentials / total spend (0–1)
    discretionary_ratio_30d: number;   // discretionary / total spend (0–1)
    anomaly_count_14d: number;         // unusual transactions count
    updated_at: string;
};

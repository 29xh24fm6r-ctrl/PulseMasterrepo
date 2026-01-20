"use client";

import { TrendPoint, TrendRow, TrendValue } from "./TrendRow";

interface StateTrendsProps {
    energyData: TrendPoint[];
    stressData: TrendPoint[];
    momentumData: TrendPoint[];
}

export function StateTrends({ energyData, stressData, momentumData }: StateTrendsProps) {
    // If no data, show placeholder
    const isEmpty = !energyData.length && !stressData.length && !momentumData.length;

    if (isEmpty) {
        return (
            <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl p-6 text-center text-zinc-400 text-sm">
                No trend data available yet.
            </div>
        );
    }

    import { TOKENS } from "@/lib/ui/tokens";

    return (
        <div className="mb-12">
            <h2 className={`text-xs font-semibold ${TOKENS.COLORS.text.dim} uppercase tracking-wider mb-4 px-2`}>
                Last 7 Days
            </h2>
            <div className={`${TOKENS.COLORS.glass.bg} ${TOKENS.COLORS.glass.border} border ${TOKENS.RADIUS.sm} p-4 shadow-sm`}>
                <TrendRow label="Energy" data={energyData} type="energy" />
                <TrendRow label="Stress" data={stressData} type="stress" />
                <TrendRow label="Momentum" data={momentumData} type="momentum" />
            </div>
        </div>
    );
}

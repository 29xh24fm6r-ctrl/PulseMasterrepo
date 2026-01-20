"use client";

import { cn } from "@/lib/utils";

export type TrendValue = 'Low' | 'Medium' | 'High';

export interface TrendPoint {
    date: string;
    value: TrendValue;
}

interface TrendRowProps {
    label: string;
    data: TrendPoint[];
    type: 'energy' | 'stress' | 'momentum';
}

export function TrendRow({ label, data, type }: TrendRowProps) {
    // Helper for visual representation
    const getHeight = (val: TrendValue) => {
        switch (val) {
            case 'High': return 'h-8';
            case 'Medium': return 'h-5';
            case 'Low': return 'h-3';
        }
    };

    const getColor = (val: TrendValue) => {
        if (type === 'stress') {
            return val === 'High' ? 'bg-amber-400' : val === 'Medium' ? 'bg-amber-200 dark:bg-amber-800' : 'bg-zinc-200 dark:bg-zinc-800';
        }
        // Energy/Momentum
        return val === 'High' ? 'bg-violet-500' : val === 'Medium' ? 'bg-violet-300 dark:bg-violet-800' : 'bg-zinc-200 dark:bg-zinc-800';
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
            <span className="text-sm font-medium text-zinc-500 w-24">{label}</span>

            <div className="flex items-end gap-1.5 h-8">
                {data.map((point, i) => (
                    <div
                        key={point.date + i}
                        className={cn(
                            "w-2 rounded-full transition-all",
                            getHeight(point.value),
                            getColor(point.value)
                        )}
                        title={`${point.date}: ${point.value}`}
                    />
                ))}
            </div>
        </div>
    );
}

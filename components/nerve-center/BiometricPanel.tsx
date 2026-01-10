"use client";

import { Activity, Moon, Zap, AlertTriangle } from "lucide-react";

interface BiometricPanelProps {
    status: "NOMINAL" | "DRIFT" | "CRITICAL";
}

export const BiometricPanel = ({ status }: BiometricPanelProps) => {
    return (
        <div className="flex flex-col gap-4 w-full h-full p-4 border-r border-white/5 bg-black/40">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                <Activity className="w-4 h-4 text-zinc-500" />
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Biometric Telemetry</span>
            </div>

            {/* Critical Alert (If Drift) */}
            {status === 'DRIFT' && (
                <div className="p-3 bg-red-900/10 border border-red-500/30 rounded-sm mb-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse block" />
                    </div>
                    <div className="text-[10px] text-red-400 uppercase tracking-widest mb-1">System Energy</div>
                    <div className="text-lg font-bold text-white mb-1">Energy Alert</div>
                    <div className="text-xs text-red-300/70 mb-2">Dip predicted in 42m</div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="w-2/3 h-full bg-amber-500" />
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="space-y-6">
                <MetricItem
                    label="HRV Variability"
                    value="42ms"
                    trend="down"
                    subtext="Reduced stress tolerance"
                    color="text-red-400"
                />
                <MetricItem
                    label="Sleep Debt"
                    value="1.5h"
                    trend="nominal"
                    subtext="Executive function nominal"
                    color="text-emerald-400"
                />
                <MetricItem
                    label="Cog. Load"
                    value="42%"
                    trend="nominal"
                    subtext="Bandwidth optimal"
                    color="text-zinc-300"
                />
            </div>
        </div>
    );
}

function MetricItem({ label, value, trend, subtext, color }: { label: string, value: string, trend: string, subtext: string, color: string }) {
    return (
        <div className="border-l-2 border-white/5 pl-3 py-1">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
                {trend === 'down' && <AlertTriangle className="w-3 h-3 text-red-500" />}
            </div>
            <div className={`text-2xl font-mono ${color} mb-1`}>{value}</div>
            <div className="text-[10px] text-zinc-500">{subtext}</div>
        </div>
    )
}

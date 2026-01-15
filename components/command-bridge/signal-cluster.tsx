'use client';
import { LifeState } from '@/lib/life-state/types';

export function SignalCluster({ state }: { state: LifeState }) {
    return (
        <div className="w-full h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <h2 className="text-white/40 text-[10px] tracking-[0.2em] font-medium uppercase font-mono">Live Telemetry</h2>
                <div className="flex gap-2 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_infinite] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-emerald-500 text-[9px] font-mono tracking-wider">LIVE</span>
                </div>
            </div>

            {/* Dense Sparkline-style Grid */}
            <div className="grid grid-cols-4 gap-4 h-full pt-4 mb-2">
                <SparkCards label="MOMENTUM" value={state.momentum_score} trend="up" color="indigo" />
                <SparkCards label="PRESSURE" value={state.stress_index} trend="flat" color="rose" isPercent />

                {/* Real Finance Data if available */}
                <SparkCards
                    label="SPEND VEL"
                    value={state.finance_telemetry?.spend_trend || 1.0}
                    trend={state.finance_telemetry?.spend_trend && state.finance_telemetry.spend_trend > 1 ? 'up' : 'flat'}
                    color={state.finance_telemetry?.spend_trend && state.finance_telemetry.spend_trend > 1.1 ? 'rose' : 'emerald'}
                    subLabel={state.finance_telemetry?.spend_trend ? `${state.finance_telemetry.spend_trend.toFixed(2)}x vs 30d` : 'No Data'}
                    isDecimal
                />
                <SparkCards label="Sleep" value={0.85} trend="down" color="emerald" isPercent subLabel="6.5h Avg" />
            </div>

            {/* Finance Telemetry Line */}
            {state.finance_telemetry && (
                <div className="flex items-center gap-6 text-[9px] font-mono text-white/40 border-t border-white/5 pt-2 mt-auto">
                    <div className="flex items-center gap-2">
                        <span>RUNWAY:</span>
                        <span className={state.finance_telemetry.runway_days !== null && state.finance_telemetry.runway_days < 30 ? 'text-rose-400' : 'text-white'}>
                            {state.finance_telemetry.runway_days !== null ? `${Math.round(state.finance_telemetry.runway_days)} DAYS` : '∞'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>ANOMALIES (14d):</span>
                        <span className={state.finance_telemetry.anomalies > 0 ? 'text-amber-400' : 'text-white'}>
                            {state.finance_telemetry.anomalies}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

function SparkCards({ label, value, trend, color, isPercent, isDecimal, subLabel }: { label: string, value: number, trend: 'up' | 'down' | 'flat', color: string, isPercent?: boolean, isDecimal?: boolean, subLabel?: string }) {
    const colors = {
        indigo: 'text-indigo-400 border-indigo-500/10 bg-indigo-500/5 group-hover:border-indigo-500/20',
        rose: 'text-rose-400 border-rose-500/10 bg-rose-500/5 group-hover:border-rose-500/20',
        emerald: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5 group-hover:border-emerald-500/20',
        cyan: 'text-cyan-400 border-cyan-500/10 bg-cyan-500/5 group-hover:border-cyan-500/20',
    };

    let displayValue = (value * 100).toFixed(0);
    if (isPercent) displayValue += '%';
    if (isDecimal) displayValue = value.toFixed(1) + 'x';

    return (
        <div className={`h-full rounded-lg border backdrop-blur-sm flex flex-col p-3 relative overflow-hidden group transition-colors ${colors[color as keyof typeof colors]}`}>
            <div className="flex justify-between items-start w-full z-10">
                <div className="text-[9px] text-white/40 font-mono tracking-widest uppercase truncate">{label}</div>
                {/* Trend Indicator */}
                <div className="opacity-50">
                    {trend === 'up' && '↗'}
                    {trend === 'down' && '↘'}
                    {trend === 'flat' && '→'}
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-end z-10">
                <div className="text-2xl font-light text-white tracking-widest leading-none">{displayValue}</div>
                {subLabel && <div className="text-[9px] text-white/30 mt-1 font-mono">{subLabel}</div>}
            </div>

            {/* Faint Background Line Chart (Mock) */}
            <svg className="absolute bottom-0 left-0 w-full h-1/2 opacity-20 pointer-events-none" viewBox="0 0 100 40" preserveAspectRatio="none">
                <path d="M0 30 Q 20 20, 40 35 T 80 10 T 100 25" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M0 30 Q 20 20, 40 35 T 80 10 T 100 25 V 40 H 0 Z" fill="currentColor" stroke="none" opacity="0.2" />
            </svg>
        </div>
    );
}

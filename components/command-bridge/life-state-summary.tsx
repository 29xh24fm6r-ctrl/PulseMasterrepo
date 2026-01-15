'use client';
import { LifeState } from '@/lib/life-state/types';

export function LifeStateSummary({ state }: { state: LifeState }) {
    const getHeadline = () => {
        if (state.financial_pressure > 0.7) return "FINANCIAL CONSTRAINT ACTIVE.";
        if (state.time_pressure > 0.7) return "TIME BANDWIDTH CRITICAL.";
        if (state.momentum_score < 0) return "MOMENTUM STALLED.";
        return "SYSTEMS NOMINAL.";
    };

    const getSubhead = () => {
        if (state.financial_pressure > 0.7) return "Burn rate analysis suggests rapid correction needed.";
        if (state.time_pressure > 0.7) return "Schedule density > 80%. Reject incoming.";
        if (state.momentum_score < 0) return "Initiate recovery protocol: Micro-wins required.";
        return "Ready for expansion. Opportunities calibrated.";
    };

    const lastUpdated = new Date(state.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="h-full flex flex-col justify-between relative">
            <div className="flex justify-between items-start">
                <h2 className="text-white/40 text-[10px] tracking-[0.2em] font-medium uppercase font-mono">Current State</h2>
                <div className="text-[9px] font-mono text-white/20">UPDATED {lastUpdated}</div>
            </div>

            <div className="space-y-4 my-auto">
                <div>
                    <div className="text-2xl font-light text-white tracking-tight leading-none uppercase mb-2">{getHeadline()}</div>
                    <div className="text-xs text-indigo-300/80 font-medium leading-tight max-w-[90%] font-mono uppercase tracking-wide border-l-2 border-indigo-500/50 pl-3">
                        {getSubhead()}
                    </div>
                </div>

                {/* Instrument Panel (Gauges) */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-4 border-t border-white/5">
                    <Gauge label="TIME PRESS" value={state.time_pressure} color="rose" />
                    <Gauge label="FIN PRESS" value={state.financial_pressure} color="rose" />
                    <Gauge label="ENERGY" value={state.energy_level} color="emerald" inverted />
                    <Gauge label="STRESS" value={state.stress_index} color="rose" />
                    <Gauge label="MOMENTUM" value={(state.momentum_score + 1) / 2} color="indigo" inverted />
                    <Gauge label="CONFIDENCE" value={state.confidence_level} color="cyan" inverted />
                </div>
            </div>
        </div>
    );
}

function Gauge({ label, value, color, inverted }: { label: string, value: number, color: string, inverted?: boolean }) {
    // Inverted: High is Good (Energy, Momentum, Confidence)
    // Normal: High is Bad (Pressure, Stress)
    const isCritical = inverted ? value < 0.3 : value > 0.7;

    // Color mapping
    const baseColor = isCritical ? 'bg-rose-500' : {
        'rose': 'bg-rose-500',
        'emerald': 'bg-emerald-500',
        'indigo': 'bg-indigo-500',
        'cyan': 'bg-cyan-500'
    }[color] || 'bg-white';

    const textColor = isCritical ? 'text-rose-400' : 'text-white/60';

    return (
        <div className="flex items-center justify-between gap-4">
            <span className={`text-[9px] font-mono tracking-wider ${textColor}`}>{label}</span>
            <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${baseColor} opacity-80`} style={{ width: `${value * 100}%` }} />
                </div>
                <span className="text-[9px] font-mono text-white w-6 text-right">{(value * 100).toFixed(0)}</span>
            </div>
        </div>
    )
}

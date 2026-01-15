'use client';
import { LifeState } from '@/lib/life-state/types';
import { useState } from 'react';

export function VectorsPanel({ state }: { state: LifeState }) {
    const [activeTab, setActiveTab] = useState<'RISK' | 'OPP'>('RISK');

    const opportunities = state.opportunity_vectors || [];
    const risks = state.risk_vectors || [];

    const displayList = activeTab === 'RISK' ? risks : opportunities;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <h2 className="text-white/40 text-[10px] tracking-[0.2em] font-medium uppercase font-mono">Active Vectors</h2>
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('RISK')}
                        className={`text-[10px] uppercase tracking-wider font-mono transition-colors ${activeTab === 'RISK' ? 'text-rose-400 border-b border-rose-500' : 'text-white/30 hover:text-white/50'}`}>
                        Risks ({risks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('OPP')}
                        className={`text-[10px] uppercase tracking-wider font-mono transition-colors ${activeTab === 'OPP' ? 'text-emerald-400 border-b border-emerald-500' : 'text-white/30 hover:text-white/50'}`}>
                        Opps ({opportunities.length})
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {displayList.length === 0 && (
                    <div className="text-white/20 text-xs text-center pt-8 italic">No active vectors in this sector.</div>
                )}

                {displayList.map((item: any, i) => (
                    <VectorCard
                        key={i}
                        type={activeTab}
                        title={activeTab === 'RISK' ? 'Risk Detected' : 'Opportunity Engine'}
                        desc={item.explanation}
                        horizon={activeTab === 'RISK' ? `${item.horizon_days}d Horizon` : `${item.window_days}d Window`}
                    />
                ))}
            </div>
        </div>
    );
}

function VectorCard({ type, title, desc, horizon }: { type: 'RISK' | 'OPP', title: string, desc: string, horizon: string }) {
    const isRisk = type === 'RISK';
    const accent = isRisk ? 'rose' : 'emerald';

    // Explicit color classes to ensure Tailwind picks them up
    // Using style object or conditional classes for the indicator
    const borderClass = isRisk ? 'hover:border-rose-500/30' : 'hover:border-emerald-500/30';
    const textClass = isRisk ? 'text-rose-300' : 'text-emerald-300';
    const bgClass = isRisk ? 'bg-rose-500' : 'bg-emerald-500';

    return (
        <div className={`rounded-md p-3 bg-white/5 border border-transparent ${borderClass} transition-colors group relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-1">
                <div className={`font-mono text-[10px] uppercase tracking-wider ${textClass} font-bold`}>
                    {title}
                </div>
                <div className="text-[9px] text-white/30 font-mono bg-black/20 px-1 rounded">
                    {horizon}
                </div>
            </div>

            <div className="text-white/70 text-xs font-light leading-snug">
                {desc}
            </div>

            {/* Left accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${bgClass} opacity-50`} />
        </div>
    );
}

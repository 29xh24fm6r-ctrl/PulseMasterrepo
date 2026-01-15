'use client';
import { LifeState } from '@/lib/life-state/types';
import { generateInsights } from '@/lib/intelligence/generateInsights';

export function IntelligenceStream({ state }: { state: LifeState }) {
    const insights = generateInsights(state);

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
            <div className='flex items-center justify-between mb-6 shrink-0 z-10'>
                <h2 className="text-white/40 text-[10px] tracking-[0.2em] font-medium uppercase font-mono">Cross-Domain Intelligence</h2>
                <div className="flex gap-3 text-[9px] font-mono opacity-60">
                    <span className="flex items-center gap-1"><span className="w-1 h-1 bg-indigo-500 rounded-full" /> FINANCE</span>
                    <span className="flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full" /> CHEF</span>
                    <span className="flex items-center gap-1"><span className="w-1 h-1 bg-rose-500 rounded-full" /> TIME</span>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar z-10 pb-4">
                {insights.length === 0 && (
                    <div className="text-white/20 text-sm font-light italic p-4 text-center border border-white/5 rounded-lg border-dashed">
                        System monitoring active. No critical correlations.
                    </div>
                )}

                {insights.map((insight, idx) => (
                    <div key={insight.id}
                        className={`p-5 rounded-lg border backdrop-blur-md transition-all duration-300 group
                  ${idx === 0 ? 'bg-[rgba(var(--surface-raised))] border-[rgba(var(--surface-glass))] shadow-lg' : 'bg-[rgba(var(--surface-base))] border-transparent opacity-80 hover:opacity-100'}`}>

                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                {idx === 0 && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono border border-indigo-500/30 animate-pulse">HERO</span>}
                                <h3 className={`font-medium tracking-wide leading-tight ${insight.severity > 0.8 ? 'text-rose-200' : 'text-white'}`}>
                                    {insight.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5 border border-white/5">
                                <span className="text-[8px] text-white/40 font-mono">CONFIDENCE</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3].map(bar => (
                                        <div key={bar} className={`w-0.5 h-1.5 rounded-full ${insight.confidence >= (bar * 0.3) ? 'bg-indigo-400' : 'bg-white/10'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="text-white/60 text-sm font-light leading-relaxed mb-4">
                            {insight.description}
                        </div>

                        {/* Causal Chain */}
                        <div className="flex items-center gap-2 text-[9px] font-mono text-white/30">
                            {insight.causal_chain.map((link, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className={i === insight.causal_chain.length - 1 ? 'text-indigo-300' : ''}>{link}</span>
                                    {i < insight.causal_chain.length - 1 && <span>→</span>}
                                </div>
                            ))}
                        </div>

                        {/* Selection Highlight */}
                        <div className="absolute inset-0 border border-indigo-500/0 group-hover:border-indigo-500/30 rounded-lg transition-colors pointer-events-none" />
                    </div>
                ))}
            </div>

            {/* Background Noise/Grid (Subtle) */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
        </div>
    );
}

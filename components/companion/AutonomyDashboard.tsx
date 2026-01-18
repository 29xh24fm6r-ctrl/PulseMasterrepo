"use client";

import { usePulseContext } from "@/lib/companion/usePulseContext";
import { useState, useEffect } from "react";

type Policy = {
    intent_type: string;
    autonomy_level: 'none' | 'l0' | 'l1';
    confidence_score: number;
};

export function AutonomyDashboard() {
    const { ownerUserId } = usePulseContext();
    // Stub data for visualization until we hook up the GET endpoint
    const [policies, setPolicies] = useState<Policy[]>([
        { intent_type: "commerce.order", autonomy_level: "l0", confidence_score: 0.82 },
        { intent_type: "comm.call", autonomy_level: "none", confidence_score: 0.45 },
    ]);

    const toggleLevel = async (p: Policy) => {
        const newLevel = p.autonomy_level === 'l0' ? 'l1' : 'l0';
        // Optimistic update
        setPolicies(prev => prev.map(x => x.intent_type === p.intent_type ? { ...x, autonomy_level: newLevel } : x));

        // Real API call
        await fetch("/api/autonomy/policy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intent_type: p.intent_type, autonomy_level: newLevel })
        });
    };

    return (
        <div className="flex flex-col gap-2 p-2 border-t border-white/10 bg-black/20">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Autonomy Controls</h3>
            <div className="space-y-1">
                {policies.map(p => (
                    <div key={p.intent_type} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded hover:bg-white/10 transition-colors">
                        <div className="flex flex-col">
                            <span className="font-semibold text-white/80">{p.intent_type}</span>
                            <span className="text-[10px] text-white/40">Conf: {Math.round(p.confidence_score * 100)}%</span>
                        </div>
                        <button
                            onClick={() => toggleLevel(p)}
                            className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition-all ${p.autonomy_level === 'l1'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : p.autonomy_level === 'l0'
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        : 'bg-white/5 text-white/30 border border-white/10'
                                }`}
                        >
                            {p.autonomy_level === 'none' ? 'MANUAL' : p.autonomy_level}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

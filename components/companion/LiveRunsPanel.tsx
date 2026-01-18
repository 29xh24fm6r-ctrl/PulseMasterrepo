"use client";

// components/companion/LiveRunsPanel.tsx
import { useState, useEffect } from "react";

// Mock types for now - would share with DB types
type ExecRun = {
    id: string;
    run_kind: string;
    status: string;
    updated_at: string;
};

export function LiveRunsPanel(props: { ownerUserId: string }) {
    const { ownerUserId } = props;
    const [runs, setRuns] = useState<ExecRun[]>([]);
    const [loading, setLoading] = useState(false);

    // Polling for demo - would use Pulse Stream in prod
    useEffect(() => {
        if (!ownerUserId) return;
        const fetchRuns = async () => {
            // In real app, this would be a filtered fetch for active runs
            // For now, we'll placeholder or integration with existing stream
            // setRuns([]); 
        };
        const interval = setInterval(fetchRuns, 3000);
        return () => clearInterval(interval);
    }, [ownerUserId]);

    return (
        <div className="flex flex-col gap-2 p-2 border-t border-white/10 bg-black/20">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Active Operations</h3>
            {runs.length === 0 ? (
                <div className="text-xs text-white/30 italic py-2">No active executors running.</div>
            ) : (
                runs.map(run => (
                    <div key={run.id} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded">
                        <span className="font-mono text-cyan-400">{run.run_kind}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${run.status === 'running' ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 'bg-white/10'
                            }`}>
                            {run.status}
                        </span>
                    </div>
                ))
            )}
        </div>
    );
}

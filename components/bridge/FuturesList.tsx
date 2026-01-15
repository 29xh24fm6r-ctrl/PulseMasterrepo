import React from 'react';
import { NowFuture } from '@/lib/now-engine/types';

export function FuturesList({
    futures,
    onPromote
}: {
    futures?: NowFuture[];
    onPromote: (f: NowFuture) => void;
}) {
    if (!futures || futures.length === 0) return null;

    return (
        <div className="w-full mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                Up Next
            </div>
            {futures.map(f => (
                <button
                    key={f.id}
                    onClick={() => onPromote(f)}
                    className="w-full group flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left"
                >
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                            {f.title}
                        </span>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                            {f.horizon === 'next' ? 'Coming up' : 'Later'} • {Math.round(f.confidence * 100)}% Match
                        </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-indigo-400 font-medium">
                        Promote &rarr;
                    </div>
                </button>
            ))}
        </div>
    );
}

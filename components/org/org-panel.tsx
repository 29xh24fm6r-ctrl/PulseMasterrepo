'use client';

import { useState } from 'react';
import { Network, ShieldCheck, UserMinus } from 'lucide-react';

interface DelegationMock {
    id: string;
    toName: string;
    scope: string;
    date: string;
}

export default function OrgPanel() {
    // Mock data for UI demonstration
    const [delegations, setDelegations] = useState<DelegationMock[]>([
        { id: '1', toName: 'Finance Team', scope: 'finance', date: '2026-01-10' },
        { id: '2', toName: 'Family Shared', scope: 'calendar', date: '2026-01-12' },
    ]);

    const handleRevoke = (id: string) => {
        // In real impl, would call Server Action
        if (confirm("Revoke this delegation?")) {
            setDelegations(prev => prev.filter(d => d.id !== id));
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center gap-2 mb-2">
                <Network className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Authority Graph</h3>
            </div>

            <div className="flex flex-col gap-3">
                {delegations.map(d => (
                    <div key={d.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                                <div className="text-sm text-zinc-200">Delegate to <span className="font-semibold text-white">{d.toName}</span></div>
                                <div className="text-xs text-zinc-500">Scope: {d.scope} • Issued {d.date}</div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleRevoke(d.id)}
                            className="p-2 hover:bg-rose-900/20 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Revoke Authority"
                        >
                            <UserMinus className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {delegations.length === 0 && (
                    <div className="text-xs text-zinc-500 italic p-2 text-center">
                        No active delegations. You retain sole authority.
                    </div>
                )}
            </div>

            <div className="pt-2 border-t border-zinc-900">
                <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 font-medium">
                    + Add New Delegate
                </button>
            </div>
        </div>
    );
}

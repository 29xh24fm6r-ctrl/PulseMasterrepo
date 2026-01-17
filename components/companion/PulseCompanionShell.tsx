// components/companion/PulseCompanionShell.tsx
"use client";

import React, { useEffect, useState } from "react";
import { QuickTalkButton } from "@/components/companion/QuickTalkButton";
import { RunEventFeed } from "@/components/companion/RunEventFeed";
import { subscribeToContextBus } from "@/lib/companion/contextBus";

/**
 * Canon:
 * - Companion is always present
 * - Buttons remain primary UX
 * - Voice is additive and observable
 */
export function PulseCompanionShell(props: { ownerUserId: string }) {
    const [context, setContext] = useState<any>({});
    const [activeRunId, setActiveRunId] = useState<string | null>(null);

    useEffect(() => {
        const unsub = subscribeToContextBus((frame) => setContext(frame));
        return () => unsub();
    }, []);

    return (
        <div className="pointer-events-auto h-full w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <div className="text-sm font-semibold text-white">Pulse</div>
                <button
                    className="text-xs rounded-full px-3 py-1 border border-white/10 bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                    onClick={() => window.open("/pulse/companion", "pulse_companion", "width=420,height=760")}
                >
                    Pop out
                </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                <div className="text-xs opacity-70 text-slate-400">Standing by</div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs opacity-70 text-slate-400">Context</div>
                    <div className="text-sm mt-1 text-white font-medium">{context?.title ?? context?.route ?? "—"}</div>
                    {context?.hints?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {context.hints.slice(0, 6).map((h: string) => (
                                <span key={h} className="text-[11px] rounded-full px-2 py-1 bg-white/10 border border-white/10 text-slate-300">
                                    {h}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="mt-3">
                    <QuickTalkButton ownerUserId={props.ownerUserId} context={context} onRunId={setActiveRunId} />
                </div>

                <div className="mt-3">
                    <RunEventFeed runId={activeRunId} ownerUserId={props.ownerUserId} />
                </div>

                <div className="text-xs opacity-60 text-slate-500 leading-relaxed">
                    Pulse stays present while you navigate pages. Pages publish context frames automatically.
                </div>
            </div>
        </div>
    );
}

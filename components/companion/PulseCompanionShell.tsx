"use client";

import React from "react";
import { subscribePulseContext, PulseContextFrame } from "@/lib/companion/contextBus";

export function PulseCompanionShell() {
    const [frame, setFrame] = React.useState<PulseContextFrame | null>(null);

    React.useEffect(() => {
        return subscribePulseContext(setFrame);
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
                    <div className="text-sm mt-1 text-white font-medium">{frame?.title ?? frame?.route ?? "—"}</div>
                    {frame?.hints?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {frame.hints.slice(0, 6).map((h) => (
                                <span key={h} className="text-[11px] rounded-full px-2 py-1 bg-white/10 border border-white/10 text-slate-300">
                                    {h}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>

                <button className="w-full rounded-xl px-4 py-3 border border-white/10 bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-all active:scale-[0.98]">
                    🎙️ Hold to talk
                </button>

                <div className="text-xs opacity-60 text-slate-500 leading-relaxed">
                    Pulse stays present while you navigate pages. Pages publish context frames automatically.
                </div>
            </div>
        </div>
    );
}

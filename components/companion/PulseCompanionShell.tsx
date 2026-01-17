"use client";

import React from "react";
import { subscribePulseContext, PulseContextFrame } from "@/lib/companion/contextBus";

import { QuickTalkButton } from "./QuickTalkButton";
import { useQuickTalk, QuickTalkTrace } from "./useQuickTalk";

export function PulseCompanionShell() {
    const [frame, setFrame] = React.useState<PulseContextFrame | null>(null);
    const [trace, setTrace] = React.useState<QuickTalkTrace | null>(null);

    const { state, startRecording, stopRecording, cancelRecording } = useQuickTalk({
        onTraceUpdate: setTrace
    });

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

                <QuickTalkButton
                    state={state}
                    onStart={startRecording}
                    onStop={() => stopRecording(frame)}
                    onCancel={cancelRecording}
                />

                {/* Live Trace Panel */}
                {trace && (
                    <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 uppercase tracking-wider">{trace.state}</span>
                            {trace.latencyMs && <span className="text-[10px] text-slate-500">{trace.latencyMs}ms</span>}
                        </div>
                        {trace.lastTranscript && (
                            <div className="text-xs text-white italic">"{trace.lastTranscript}"</div>
                        )}
                        {trace.lastIntent && (
                            <div className="text-[10px] font-mono text-emerald-400/80 break-all">{trace.lastIntent}</div>
                        )}
                        {trace.error && (
                            <div className="text-[10px] font-mono text-red-400 break-all">{trace.error}</div>
                        )}
                    </div>
                )}

                <div className="text-xs opacity-60 text-slate-500 leading-relaxed">
                    Pulse stays present while you navigate pages. Pages publish context frames automatically.
                </div>
            </div>
        </div>
    );
}

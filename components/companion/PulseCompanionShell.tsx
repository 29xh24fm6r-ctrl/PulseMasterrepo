// components/companion/PulseCompanionShell.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { QuickTalkButton } from "@/components/companion/QuickTalkButton";
import { RunEventFeed } from "@/components/companion/RunEventFeed";
import { IntentProposalCard } from "@/components/companion/IntentProposalCard";
import { PatternsPanel } from "@/components/companion/PatternsPanel";
import { subscribeToContextBus } from "@/lib/companion/contextBus";
import { InsightCard } from "@/components/companion/InsightCard";

type PulseIntent =
    | { type: "RUN_ORACLE"; confidence: number; oracle_id: string; args?: Record<string, any> }
    | { type: "NAVIGATE"; confidence: number; path: string }
    | { type: "CREATE_REMINDER"; confidence: number; content: string; when?: string }
    | { type: "UNKNOWN"; confidence: number; reason?: string };

type SimpleInsight = { summary: string; confidence: number };

export function PulseCompanionShell(props: { ownerUserId: string }) {
    const [context, setContext] = useState<any>({});
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [latestIntent, setLatestIntent] = useState<PulseIntent | null>(null);
    const [insights, setInsights] = useState<SimpleInsight[]>([]);

    useEffect(() => {
        const unsub = subscribeToContextBus((frame) => setContext(frame));
        return () => unsub();
    }, []);

    // Trigger insights on mount
    useEffect(() => {
        generateInsights();
    }, []);

    async function generateInsights() {
        try {
            const res = await fetch("/api/insights/generate", {
                method: "POST",
                headers: { "x-owner-user-id": props.ownerUserId },
            });
            if (!res.ok) return;
            const json = await res.json();
            // If a run is started, we can optionally track it. 
            // For now, allow it to run in background or foreground if we want to see it.
            // To keep it observational, let's not force-switch the view unless user has no active run.
            if (json.run_id && !activeRunId) {
                setActiveRunId(json.run_id);
            }
        } catch { }
    }

    const pageActions = useMemo(() => (Array.isArray(context?.actions) ? context.actions : []), [context]);

    function onDismissProposal() {
        setLatestIntent(null);
    }

    async function runOracle(oracleId: string, args?: Record<string, any>) {
        // Start oracle run through the execution plane
        const res = await fetch(`/api/oracles/${oracleId}/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-owner-user-id": props.ownerUserId,
            },
            body: JSON.stringify({ input: args ?? {}, context }),
        });

        if (!res.ok) return;
        const json = await res.json();
        if (json?.run_id) {
            setActiveRunId(json.run_id);
        }
    }

    function navigateTo(path: string) {
        // Canon: navigation is still user-controlled; we can later integrate router push.
        window.location.href = path;
    }

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

                <QuickTalkButton
                    ownerUserId={props.ownerUserId}
                    context={context}
                    onRunId={(id) => {
                        setActiveRunId(id);
                        setLatestIntent(null); // reset proposal until we parse new intent
                        setInsights([]); // clear old insights
                    }}
                />

                {/* Live Trace (voice or oracle) */}
                <RunEventFeed
                    runId={activeRunId}
                    ownerUserId={props.ownerUserId}
                    onRunDoneExtractIntent={(intent) => setLatestIntent(intent)}
                    onRunDoneExtractInsights={(newInsights) => {
                        if (newInsights && newInsights.length > 0) {
                            setInsights(newInsights);
                        }
                    }}
                />

                {insights.map((insight, i) => (
                    <InsightCard
                        key={i}
                        insight={insight}
                        onDismiss={() => setInsights(prev => prev.filter((_, idx) => idx !== i))}
                    />
                ))}

                <IntentProposalCard
                    intent={latestIntent}
                    pageActions={pageActions}
                    onRunOracle={runOracle}
                    onNavigate={navigateTo}
                    onDismiss={onDismissProposal}
                />

                <PatternsPanel ownerUserId={props.ownerUserId} context={context} />

                <div className="text-[11px] opacity-70 text-slate-500">
                    Pulse 6.5: Passive Insight Generation Active
                </div>
            </div>
        </div>
    );
}
// Maintain default export for compatibility
export default PulseCompanionShell;

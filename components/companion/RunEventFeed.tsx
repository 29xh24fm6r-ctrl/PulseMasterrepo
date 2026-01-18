// components/companion/RunEventFeed.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { useRunStream } from "@/components/companion/useRunStream";

type PulseIntent =
    | { type: "RUN_ORACLE"; confidence: number; oracle_id: string; args?: Record<string, any> }
    | { type: "NAVIGATE"; confidence: number; path: string }
    | { type: "CREATE_REMINDER"; confidence: number; content: string; when?: string }
    | { type: "PURCHASE_PREPARE"; confidence: number; merchant_key: string; category: string; amount_cents?: number }
    | { type: "COMMERCE_REQUEST"; confidence: number; request_text: string; }
    | { type: "UNKNOWN"; confidence: number; reason?: string };

export function RunEventFeed(props: {
    runId: string | null;
    ownerUserId: string | null;
    onRunDoneExtractIntent?: (intent: PulseIntent | null) => void;
    onRunDoneExtractInsights?: (insights: any[]) => void;
    onRunDoneExtractProposal?: (proposal: any) => void;
}) {
    const { events, status } = useRunStream({ runId: props.runId, ownerUserId: props.ownerUserId });

    const lastRunDone = useMemo(() => {
        for (let i = events.length - 1; i >= 0; i--) {
            if (events[i].event === "RUN_DONE") return events[i];
        }
        return null;
    }, [events]);

    useEffect(() => {
        if (!lastRunDone) return;
        const payload = lastRunDone.data?.payload ?? lastRunDone.data;

        // Voice Intent extraction
        if (props.onRunDoneExtractIntent) {
            const intent = payload?.output?.intent ?? payload?.intent ?? null;
            if (intent) props.onRunDoneExtractIntent(intent);
        }

        // System Insights extraction
        if (props.onRunDoneExtractInsights) {
            const insights = payload?.output?.insights ?? payload?.insights ?? null;
            if (Array.isArray(insights) && insights.length > 0) {
                props.onRunDoneExtractInsights(insights);
            }
        }

        // Consent Proposal extraction
        if (props.onRunDoneExtractProposal) {
            const proposal = payload?.output?.proposal ?? payload?.proposal ?? null;
            if (proposal) props.onRunDoneExtractProposal(proposal);
        }
    }, [lastRunDone]);

    if (!props.runId) return <div className="text-xs opacity-60">No active run.</div>;

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Live Trace</div>
                <div className="text-[11px] opacity-70">{status}</div>
            </div>

            <div className="mt-2 max-h-44 overflow-auto text-[11px] leading-snug">
                {events.map((e, i) => (
                    <div key={i} className="py-1 border-b border-white/5 last:border-b-0">
                        <div className="opacity-80">{e.event}</div>
                        <pre className="whitespace-pre-wrap break-words opacity-70">
                            {typeof e.data === "string" ? e.data : JSON.stringify(e.data, null, 2)}
                        </pre>
                    </div>
                ))}
            </div>
        </div>
    );
}

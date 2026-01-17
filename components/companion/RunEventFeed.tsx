// components/companion/RunEventFeed.tsx
"use client";

import React from "react";
import { useRunStream } from "@/components/companion/useRunStream";

export function RunEventFeed(props: { runId: string | null; ownerUserId: string | null }) {
    const { events, status } = useRunStream({ runId: props.runId, ownerUserId: props.ownerUserId });

    if (!props.runId) {
        return <div className="text-xs opacity-60">No active run.</div>;
    }

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

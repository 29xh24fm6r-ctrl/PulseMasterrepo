// components/companion/QuickTalkButton.tsx
"use client";

import React, { useRef } from "react";
import { useQuickTalk } from "@/components/companion/useQuickTalk";

export function QuickTalkButton(props: { ownerUserId: string; context: any; onRunId: (id: string) => void }) {
    const { state, runId, error, start, stop, toggle } = useQuickTalk({
        ownerUserId: props.ownerUserId,
        context: props.context,
    });

    const holdActive = useRef(false);

    // When runId appears, bubble it up
    React.useEffect(() => {
        if (runId) props.onRunId(runId);
    }, [runId]);

    const label =
        state === "idle"
            ? "Hold to Talk"
            : state === "listening"
                ? "Listening…"
                : state === "uploading"
                    ? "Sending…"
                    : state === "done"
                        ? "Done"
                        : "Error";

    return (
        <div className="flex flex-col gap-2">
            <button
                className="rounded-xl px-3 py-2 text-sm border border-white/15 bg-white/5 hover:bg-white/10 w-full text-left"
                onMouseDown={async () => {
                    holdActive.current = true;
                    await start();
                }}
                onMouseUp={async () => {
                    if (!holdActive.current) return;
                    holdActive.current = false;
                    await stop();
                }}
                onMouseLeave={async () => {
                    if (!holdActive.current) return;
                    holdActive.current = false;
                    await stop();
                }}
                onClick={(e) => {
                    // If user clicks without holding, treat as toggle
                    // (avoid double-trigger on mouse events)
                    if (holdActive.current) return;
                    toggle();
                }}
                aria-pressed={state === "listening"}
            >
                🎙️ {label}
            </button>

            {error ? <div className="text-xs text-red-300">{error}</div> : null}

            <div className="text-[11px] opacity-70">
                Tap toggles. Hold records. Voice never auto-runs actions—only proposes.
            </div>
        </div>
    );
}

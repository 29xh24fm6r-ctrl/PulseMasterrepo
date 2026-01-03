"use client";

import * as React from "react";

type PulseEvent =
    | { kind: "interaction_added"; at: string }
    | { kind: "followup_done"; at: string };

type Mode = "idle" | "thinking" | "updated";

export function RelationshipPulseBanner(props: {
    personName?: string | null;
    contactId: string;
}) {
    const [mode, setMode] = React.useState<Mode>("idle");
    const [last, setLast] = React.useState<PulseEvent | null>(null);

    // Expose a global dispatcher for this page instance (simple & effective)
    React.useEffect(() => {
        const key = `__pulse_oracle_evt_${props.contactId}`;
        (window as any)[key] = (evt: PulseEvent) => {
            setLast(evt);
            setMode("thinking");

            // Thinking phase
            window.setTimeout(() => setMode("updated"), 650);
            // Back to idle after a beat
            window.setTimeout(() => setMode("idle"), 2200);
        };

        return () => {
            delete (window as any)[key];
        };
    }, [props.contactId]);

    const headline =
        mode === "thinking"
            ? "Oracle is thinking…"
            : mode === "updated"
                ? "Relationship model updated"
                : "Relationship Pulse";

    const sub =
        last
            ? last.kind === "interaction_added"
                ? "New interaction captured. Recomputing context + momentum."
                : "Follow-up completed. Updating reliability + responsiveness."
            : "Signals update as you log interactions and complete follow-ups.";

    const dotClass =
        mode === "thinking"
            ? "pulse-soft bg-yellow-500"
            : mode === "updated"
                ? "opacity-100 bg-green-500"
                : "opacity-70 bg-cyan-500";

    return (
        <div className="rounded-2xl border border-gray-800 p-4 bg-gray-900/80 backdrop-blur shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                        <div className="font-semibold text-gray-100">
                            {headline}{props.personName ? ` — ${props.personName}` : ""}
                        </div>
                    </div>
                    <div className={`mt-1 text-sm text-gray-400 ${mode === "thinking" ? "pulse-soft" : ""}`}>
                        {sub}
                    </div>
                </div>

                <div className="text-xs text-gray-600 font-mono">
                    {last ? new Date(last.at).toLocaleTimeString() : ""}
                </div>
            </div>

            {mode !== "idle" ? (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                        className="h-full bg-cyan-500"
                        style={{
                            width: mode === "thinking" ? "55%" : "100%",
                            transition: "width 600ms cubic-bezier(0.2,0.8,0.2,1)",
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}

// components/companion/IntentProposalCard.tsx
"use client";

import React, { useMemo } from "react";

type PulseIntent =
    | { type: "RUN_ORACLE"; confidence: number; oracle_id: string; args?: Record<string, any> }
    | { type: "NAVIGATE"; confidence: number; path: string }
    | { type: "CREATE_REMINDER"; confidence: number; content: string; when?: string }
    | { type: "UNKNOWN"; confidence: number; reason?: string };

const PROPOSE_THRESHOLD = 0.8;

export function IntentProposalCard(props: {
    intent: PulseIntent | null;
    pageActions?: Array<{ id: string; label: string }>;
    onRunOracle: (oracleId: string, args?: Record<string, any>) => void;
    onNavigate: (path: string) => void;
    onDismiss: () => void;
}) {
    const intent = props.intent;

    const eligible = useMemo(() => {
        if (!intent) return false;
        return intent.confidence >= PROPOSE_THRESHOLD && intent.type !== "UNKNOWN";
    }, [intent]);

    if (!intent) return null;

    const badge =
        intent.confidence >= 0.9 ? "High" : intent.confidence >= 0.8 ? "Good" : intent.confidence >= 0.6 ? "Low" : "Very Low";

    const title =
        intent.type === "RUN_ORACLE"
            ? `I think you want to run: ${friendlyOracle(intent.oracle_id)}`
            : intent.type === "NAVIGATE"
                ? `I think you want to go to: ${intent.path}`
                : intent.type === "CREATE_REMINDER"
                    ? `I think you want a reminder`
                    : `I’m not sure what you meant`;

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Proposal</div>
                <div className="text-[11px] opacity-70">
                    {badge} confidence • {(intent.confidence * 100).toFixed(0)}%
                </div>
            </div>

            <div className="mt-2 text-sm">{title}</div>

            {intent.type === "CREATE_REMINDER" ? (
                <div className="mt-2 text-xs opacity-80">
                    <div className="opacity-70">Captured</div>
                    <div className="mt-1">{intent.content}</div>
                </div>
            ) : null}

            <div className="mt-3 flex gap-2">
                {eligible ? (
                    <>
                        {intent.type === "RUN_ORACLE" ? (
                            <button
                                className="rounded-lg px-3 py-1.5 text-xs border border-white/15 bg-white/10 hover:bg-white/15"
                                onClick={() => props.onRunOracle(intent.oracle_id, intent.args)}
                            >
                                Run
                            </button>
                        ) : null}

                        {intent.type === "NAVIGATE" ? (
                            <button
                                className="rounded-lg px-3 py-1.5 text-xs border border-white/15 bg-white/10 hover:bg-white/15"
                                onClick={() => props.onNavigate(intent.path)}
                            >
                                Go
                            </button>
                        ) : null}

                        <button
                            className="rounded-lg px-3 py-1.5 text-xs border border-white/10 bg-transparent hover:bg-white/5"
                            onClick={props.onDismiss}
                        >
                            Dismiss
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className="rounded-lg px-3 py-1.5 text-xs border border-white/10 bg-transparent hover:bg-white/5"
                            onClick={props.onDismiss}
                        >
                            Dismiss
                        </button>
                        {props.pageActions?.length ? (
                            <div className="text-[11px] opacity-70 self-center">
                                Not confident — use trusted actions:{" "}
                                {props.pageActions.slice(0, 2).map((a) => a.label).join(" • ")}
                            </div>
                        ) : (
                            <div className="text-[11px] opacity-70 self-center">Not confident — I’ll need a bit more.</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function friendlyOracle(id: string) {
    if (id === "contact_oracle_v1") return "Contact Oracle";
    return id;
}

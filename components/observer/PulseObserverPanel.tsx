"use client";

import { useMemo, useState } from "react";
import { buildBundle, clearEvents, setObserverEnabled, isObserverEnabled, pushEvent } from "@/lib/observer/store";

function copy(text: string) {
    return navigator.clipboard.writeText(text);
}

export default function PulseObserverPanel({ route }: { route?: string }) {
    const [open, setOpen] = useState(true);
    const [note, setNote] = useState("");

    // Force re-render when toggling enabled state isn't enough, we rely on parent mount or reload.
    // But strictly for reading:
    const enabled = isObserverEnabled();

    const bundle = useMemo(() => {
        if (typeof window === "undefined") return null;
        return buildBundle(route);
    }, [route, open, note]);

    if (!enabled) return null;

    return (
        <div
            style={{
                position: "fixed",
                right: 12,
                bottom: 12,
                width: open ? 360 : 56,
                zIndex: 9999,
                borderRadius: 18,
                backdropFilter: "blur(14px)",
                background: "rgba(20,20,25,0.55)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                color: "rgba(255,255,255,0.92)",
                overflow: "hidden",
                fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                <div
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: "rgba(120,255,170,0.95)",
                        boxShadow: "0 0 10px rgba(120,255,170,0.5)",
                    }}
                />
                <div style={{ flex: 1, fontSize: 12, opacity: 0.92 }}>
                    Pulse Observer
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                        route: {route || "(unknown)"}
                    </div>
                </div>

                <button
                    onClick={() => setOpen(v => !v)}
                    style={{
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "inherit",
                        borderRadius: 10,
                        padding: "6px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                    }}
                >
                    {open ? "Hide" : "Open"}
                </button>
            </div>

            {open && bundle && (
                <div style={{ padding: "0 12px 12px 12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <Stat label="Errors" value={bundle.summary.errors.count} />
                        <Stat label="Net fails" value={bundle.summary.network.failures} />
                        <Stat label="Clicks" value={bundle.summary.interactions.clicks} />
                        <Stat label="Inputs" value={bundle.summary.interactions.inputs} />
                    </div>

                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a quick note: what felt wrong, confusing, slow?"
                        style={{
                            width: "100%",
                            minHeight: 64,
                            resize: "vertical",
                            borderRadius: 14,
                            padding: 10,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.05)",
                            color: "inherit",
                            outline: "none",
                            fontSize: 12,
                            lineHeight: 1.35,
                            marginBottom: 10,
                        }}
                    />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                            onClick={async () => {
                                pushEvent({ type: "note", route, message: note?.slice(0, 120) || "" });
                                const payload = JSON.stringify(buildBundle(route), null, 2);
                                await copy(payload);
                            }}
                            style={btnStyle()}
                        >
                            Copy Feedback Bundle
                        </button>

                        <button
                            onClick={() => {
                                const payload = JSON.stringify(buildBundle(route), null, 2);
                                const blob = new Blob([payload], { type: "application/json" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `pulse-observer-${Date.now()}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            style={btnStyle()}
                        >
                            Download JSON
                        </button>

                        <button
                            onClick={() => clearEvents()}
                            style={btnStyle("danger")}
                        >
                            Clear
                        </button>

                        <button
                            onClick={() => { setObserverEnabled(false); window.location.reload(); }}
                            style={btnStyle()}
                        >
                            Disable
                        </button>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
                        Privacy: inputs are never logged raw — only field name + length.
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: any }) {
    return (
        <div
            style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                padding: 10,
            }}
        >
            <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
            <div style={{ fontSize: 16, marginTop: 2 }}>{String(value)}</div>
        </div>
    );
}

function btnStyle(kind?: "danger") {
    return {
        border: "1px solid rgba(255,255,255,0.14)",
        background: kind === "danger" ? "rgba(255,80,80,0.18)" : "rgba(255,255,255,0.06)",
        color: "inherit",
        borderRadius: 12,
        padding: "8px 10px",
        fontSize: 12,
        cursor: "pointer",
    } as const;
}

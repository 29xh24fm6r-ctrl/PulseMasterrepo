"use client";

import { useMemo, useState, useEffect } from "react";
import { buildBundle, clearEvents, pushEvent } from "@/lib/observer/store";
import {
    isObserverEnabled,
    disableObserver,
    isObserverHidden,
    setObserverHidden,
    getObserverDock,
    setObserverDock,
    type ObserverDock
} from "@/lib/observer/enabled";

function copy(text: string) {
    return navigator.clipboard.writeText(text);
}

const DOCK_BR = "br";
const DOCK_BL = "bl";

export default function PulseObserverPanel({ route: routeProp }: { route?: string }) {
    // If mounted via ObserverMount, routeProp might be undefined initially until we grab it or pass it.
    // Actually, PulseObserverPanel is cleaner if it just grabs route from window if needed or passed.
    // The original one took route param. Let's see if we can get it from hook or just let it be.
    // For the bundle, buildBundle(route) works.
    // Ideally, this component should still use usePathname if we want live route updates in the bundle.
    // But for now, let's keep it simple and maybe just use window.location.pathname if route is missing.

    const [open, setOpen] = useState(true);
    const [note, setNote] = useState("");
    const [dock, setDock] = useState<ObserverDock>("br");
    const [hidden, setHidden] = useState(false);
    const [route, setRoute] = useState(routeProp || "");
    const [diagnostics, setDiagnostics] = useState<{ env: string; authed: boolean; build: string } | null>(null);

    useEffect(() => {
        // Phase 25K: Independent probe for Observer
        if (open) {
            fetch('/api/runtime/whoami')
                .then(res => res.json())
                .then(data => setDiagnostics({ env: data.env, authed: data.authed, build: data.build }))
                .catch(() => setDiagnostics({ env: 'error', authed: false, build: '?' }));
        }
    }, [open]);


    // Hydrate state from storage
    useEffect(() => {
        if (typeof window === "undefined") return;
        setDock(getObserverDock());
        setHidden(isObserverHidden());
        setOpen(!isObserverHidden()); // If hidden is true, open is false.

        // Auto-avoid Bridge collision on mount
        if (window.location.pathname === "/bridge") {
            const d = getObserverDock();
            if (d === "br") {
                setObserverDock("bl");
                setDock("bl");
            }
        }

        // Capture route if not passed
        if (!routeProp) {
            setRoute(window.location.pathname);
        }
    }, [routeProp]);

    // Keep route sync if prop changes
    useEffect(() => {
        if (routeProp) setRoute(routeProp);
    }, [routeProp]);

    // also track pathname changes if we are self-contained?
    // The ObserverMount doesn't pass route currently.
    // Let's add a quick listener or just rely on re-renders if parent updates.
    // The spec didn't strictly say ObserverMount needs to pass route, but useObserverRuntime does.
    // We'll leave the runtime hook separate (it's mounted in layout separately? No, wait.)
    // The spec says: "Replace PulseObserverMount with ObserverMount. Ensure top-level mounting near body end."
    // AND "Remove PulseObserverMount".
    // BUT `useObserverRuntime` was inside `PulseObserverMount`.
    // We need to make sure `ObserverMount` or `PulseObserverPanel` ALso runs the runtime hook, or we put `useObserverRuntime` in `ObserverMount`.
    // The spec didn't explicitly say to move `useObserverRuntime` to `ObserverMount`.
    // But if `PulseObserverMount` is being removed, and it called `useObserverRuntime`, we must move that call.
    // I will add `useObserverRuntime` to `ObserverMount` or `PulseObserverPanel`. `ObserverMount` seems best place for "headless" logic + rendering Panel.
    // But wait, `ObserverMount` is conditionally rendering Panel. If disabled, it returns null.
    // If disabled, runtime shouldn't run. So `ObserverMount` is good place.
    // However, I am editing PulseObserverPanel here.

    const bundle = useMemo(() => {
        if (typeof window === "undefined") return null;
        return buildBundle(route);
    }, [route, open, note, hidden]); // Re-calc when opened/state changes

    if (!isObserverEnabled()) return null;
    if (hidden && !open) {
        // Small "Show" tab or just invisible?
        // Spec says: "Click Hide -> panel collapses but remains enabled".
        // Usually that means a small "Open" button remains.
        // But step 5E says "Make Hide purely visual (no unmount)".
        // Let's render a minimized state.
    }

    const positionStyle = dock === DOCK_BL ? { left: 16, right: 'auto' } : { right: 16, left: 'auto' };

    if (hidden) {
        // Render collapsed "pill"
        return (
            <div
                style={{
                    position: "fixed",
                    bottom: 16,
                    ...positionStyle,
                    zIndex: 2147483647,
                    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
                }}
            >
                <button
                    onClick={() => {
                        setHidden(false);
                        setObserverHidden(false);
                        setOpen(true);
                    }}
                    style={{
                        background: "rgba(20,20,25,0.85)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "rgba(120,255,170,0.95)",
                        borderRadius: 20,
                        padding: "6px 12px",
                        fontSize: 12,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        backdropFilter: "blur(4px)",
                        fontWeight: 500
                    }}
                >
                    Pulse Observer
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                position: "fixed",
                bottom: 16,
                ...positionStyle,
                width: open ? 360 : 56, // Wait, if open=false but not hidden, what is it? Just a small icon?
                // The original code had open/hide toggle.
                // Let's keep the original "Open/Hide" (collapse) behavior separate from "Hard Hide" (setObserverHidden).
                // Actually, let's map "Hide" button to the setObserverHidden flow for persistence.
                zIndex: 2147483647,
                borderRadius: 18,
                backdropFilter: "blur(14px)",
                background: "rgba(20,20,25,0.85)", // Darker for contrast
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                color: "rgba(255,255,255,0.92)",
                overflow: "hidden",
                fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
                transition: "all 0.2s ease-out"
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.02)" }}>
                <div
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: "rgba(120,255,170,0.95)",
                        boxShadow: "0 0 10px rgba(120,255,170,0.5)",
                    }}
                />
                <div style={{ flex: 1, fontSize: 12, opacity: 0.92, fontWeight: 500 }}>
                    Pulse Observer
                </div>

                {open && (
                    <button
                        onClick={() => {
                            const newDock = dock === DOCK_BR ? DOCK_BL : DOCK_BR;
                            setDock(newDock);
                            setObserverDock(newDock);
                        }}
                        style={{
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "transparent",
                            color: "rgba(255,255,255,0.6)",
                            borderRadius: 8,
                            padding: "4px 6px",
                            fontSize: 10,
                            cursor: "pointer",
                            marginRight: 4
                        }}
                        title="Dock to other side"
                    >
                        {dock === DOCK_BR ? "←" : "→"}
                    </button>
                )}

                <button
                    onClick={() => {
                        // This is the "Hide" / "Collapse" button. 
                        // We'll map it to "Hidden" state so it persists.
                        setHidden(true);
                        setObserverHidden(true);
                    }}
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
                    Hide
                </button>
            </div>

            {open && bundle && (
                <div style={{ padding: "0 12px 12px 12px" }}>
                    <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 8, marginLeft: 2, fontFamily: "monospace" }}>
                        {route || "..."}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <Stat label="Errors" value={bundle.summary.errors.count} />
                        <Stat label="Net fails" value={bundle.summary.network.failures} />
                        <Stat label="Clicks" value={bundle.summary.interactions.clicks} />
                        <Stat label="Inputs" value={bundle.summary.interactions.inputs} />
                    </div>

                    {/* Phase 25K Badges */}
                    {diagnostics && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                            <Badge label="ENV" value={diagnostics.env} color={diagnostics.env === 'production' ? 'green' : 'amber'} />
                            <Badge label="AUTH" value={diagnostics.authed ? 'YES' : 'NO'} color={diagnostics.authed ? 'green' : 'red'} />
                            <Badge label="VER" value={diagnostics.build} color="gray" />
                        </div>
                    )}


                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a quick note..."
                        style={{
                            width: "100%",
                            minHeight: 64,
                            resize: "vertical",
                            borderRadius: 14,
                            padding: 10,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(0,0,0,0.2)",
                            color: "inherit",
                            outline: "none",
                            fontSize: 12,
                            lineHeight: 1.35,
                            marginBottom: 10,
                        }}
                    />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button
                                onClick={async () => {
                                    pushEvent({ type: "note", route, message: note?.slice(0, 120) || "" });
                                    const payload = JSON.stringify(buildBundle(route), null, 2);
                                    await copy(payload);
                                    setNote(""); // clear note after copy for fresh start
                                }}
                                style={btnStyle()}
                            >
                                Copy Bundle
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
                                title="Download JSON"
                            >
                                JSON
                            </button>
                            <button
                                onClick={() => clearEvents()}
                                style={btnStyle("danger")}
                                title="Clear Events"
                            >
                                Clear
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                disableObserver();
                                window.location.reload();
                            }}
                            style={{ ...btnStyle(), opacity: 0.6, fontSize: 11 }}
                        >
                            Disable
                        </button>
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
                padding: "8px 10px",
            }}
        >
            <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: 16, marginTop: 2, fontWeight: 600 }}>{String(value)}</div>
        </div>
    );
}

function btnStyle(kind?: "danger") {
    return {
        border: "1px solid rgba(255,255,255,0.14)",
        background: kind === "danger" ? "rgba(255,80,80,0.15)" : "rgba(255,255,255,0.1)",
        color: "inherit",
        borderRadius: 10,
        padding: "6px 10px",
        fontSize: 12,
        cursor: "pointer",
        fontWeight: 500
    } as const;
}

function Badge({ label, value, color }: { label: string; value: string; color: 'green' | 'amber' | 'red' | 'gray' }) {
    const map = {
        green: 'rgba(120,255,170,0.2)',
        amber: 'rgba(255,200,80,0.2)',
        red: 'rgba(255,80,80,0.2)',
        gray: 'rgba(255,255,255,0.1)'
    };
    const textMap = {
        green: 'rgba(120,255,170,0.9)',
        amber: 'rgba(255,200,80,0.9)',
        red: 'rgba(255,80,80,0.9)',
        gray: 'rgba(255,255,255,0.6)'
    };

    return (
        <div style={{
            background: map[color],
            color: textMap[color],
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 600,
            border: `1px solid ${map[color]}`,
            display: 'flex',
            gap: 4
        }}>
            <span style={{ opacity: 0.7 }}>{label}</span>
            <span>{value}</span>
        </div>
    );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPresenceChannel } from "@/lib/presence/channel";
import type { PresenceError, PresenceEvent, PresenceMsg, PresenceState } from "@/lib/presence/types";

type DiagnosticsPacket = {
    ts: number;
    state: PresenceState | null;
    errors: PresenceError[];
    events: PresenceEvent[];
    notes: string;
    userAgent?: string;
};

const MAX_EVENTS = 80;
const MAX_ERRORS = 20;

export default function PresenceShell() {
    const [connected, setConnected] = useState(false);
    const [state, setState] = useState<PresenceState | null>(null);
    const [events, setEvents] = useState<PresenceEvent[]>([]);
    const [errors, setErrors] = useState<PresenceError[]>([]);
    const [notes, setNotes] = useState("");
    const [includeEvents, setIncludeEvents] = useState(true);
    const [includeErrors, setIncludeErrors] = useState(true);

    const chanRef = useRef<ReturnType<typeof createPresenceChannel> | null>(null);

    const onMsg = (msg: PresenceMsg) => {
        if (msg.type === "presence:ping") setConnected(true);
        if (msg.type === "presence:state") setState(msg.payload);
        if (msg.type === "presence:event") {
            setEvents((prev) => [msg.payload, ...prev].slice(0, MAX_EVENTS));
        }
        if (msg.type === "presence:error") {
            setErrors((prev) => [msg.payload, ...prev].slice(0, MAX_ERRORS));
        }
    };

    useEffect(() => {
        const chan = createPresenceChannel(onMsg);
        chanRef.current = chan;

        // announce presence
        chan.post({ type: "presence:hello", from: "presence", ts: Date.now() });

        // keepalive: if we get pinged, we consider connected
        const t = window.setInterval(() => {
            chan.post({ type: "presence:hello", from: "presence", ts: Date.now() });
        }, 3000);

        return () => {
            window.clearInterval(t);
            chan.close();
            chanRef.current = null;
        };
    }, []);

    const packet: DiagnosticsPacket = useMemo(() => {
        return {
            ts: Date.now(),
            state,
            errors: includeErrors ? errors : [],
            events: includeEvents ? events : [],
            notes,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        };
    }, [state, errors, events, notes, includeEvents, includeErrors]);

    const copyPacket = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
        } catch {
            // fallback
            const ta = document.createElement("textarea");
            ta.value = JSON.stringify(packet, null, 2);
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <div className="mx-auto max-w-5xl p-4 space-y-4">
                <header className="flex items-center justify-between">
                    <div>
                        <div className="text-xl font-semibold">Pulse Presence</div>
                        <div className="text-sm text-zinc-400">
                            Status:{" "}
                            <span className={connected ? "text-emerald-400" : "text-amber-400"}>
                                {connected ? "Connected" : "Waiting for main window..."}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={copyPacket}
                            className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                        >
                            Copy Diagnostics
                        </button>
                    </div>
                </header>

                <section className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4">
                    <div className="text-sm font-medium text-zinc-200">Live State</div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-3">
                            <div className="text-zinc-400">Route</div>
                            <div className="mt-1">{state?.route ?? "—"}</div>
                        </div>
                        <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-3">
                            <div className="text-zinc-400">Env</div>
                            <div className="mt-1">{state?.envHint ?? "—"}</div>
                        </div>
                        <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-3">
                            <div className="text-zinc-400">User</div>
                            <div className="mt-1">{state?.userHint ?? "—"}</div>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-zinc-200">UX Feedback</div>
                        <div className="flex gap-3 text-xs text-zinc-300">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={includeEvents}
                                    onChange={(e) => setIncludeEvents(e.target.checked)}
                                />
                                Include events
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={includeErrors}
                                    onChange={(e) => setIncludeErrors(e.target.checked)}
                                />
                                Include errors
                            </label>
                        </div>
                    </div>

                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What feels wrong? What did you expect? What happened instead?"
                        className="w-full min-h-[120px] rounded-xl bg-zinc-950/40 border border-zinc-800 p-3 text-sm outline-none"
                    />
                    <div className="text-xs text-zinc-400">
                        Tip: Click <span className="text-zinc-200">Copy Diagnostics</span> and paste it back to me.
                    </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4">
                        <div className="text-sm font-medium text-zinc-200">Recent Events</div>
                        <div className="mt-3 space-y-2 max-h-[420px] overflow-auto pr-1">
                            {events.length === 0 ? (
                                <div className="text-sm text-zinc-500">No events yet.</div>
                            ) : (
                                events.map((e) => (
                                    <div key={e.id} className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-3">
                                        <div className="flex items-center justify-between text-xs text-zinc-400">
                                            <span>{e.kind}</span>
                                            <span>{new Date(e.ts).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="mt-1 text-sm">{e.label ?? e.route ?? "—"}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4">
                        <div className="text-sm font-medium text-zinc-200">Recent Errors</div>
                        <div className="mt-3 space-y-2 max-h-[420px] overflow-auto pr-1">
                            {errors.length === 0 ? (
                                <div className="text-sm text-zinc-500">No errors.</div>
                            ) : (
                                errors.map((er, idx) => (
                                    <div key={`${er.ts}-${idx}`} className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-3">
                                        <div className="flex items-center justify-between text-xs text-zinc-400">
                                            <span>{er.source ?? "error"}</span>
                                            <span>{new Date(er.ts).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="mt-1 text-sm">{er.message}</div>
                                        {er.route ? <div className="mt-1 text-xs text-zinc-500">{er.route}</div> : null}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                <footer className="text-xs text-zinc-500 pb-6">
                    Presence Shell v1 — BroadcastChannel + localStorage fallback — no server persistence.
                </footer>
            </div>
        </div>
    );
}

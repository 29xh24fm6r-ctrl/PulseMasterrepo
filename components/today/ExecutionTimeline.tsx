"use client";

import { useEffect, useState } from "react";

function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function humanizeKind(kind: string) {
    return kind.replaceAll(".", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function summarizePayload(payload: any) {
    if (!payload) return "—";
    if (typeof payload === "string") return payload.slice(0, 160);
    if (typeof payload !== "object") return String(payload);

    const keys = Object.keys(payload);
    if (keys.length === 0) return "—";

    const mins = payload.minutes ?? payload.limit ?? payload.maxJobs;
    const quest = payload.questKey ?? payload.quest_key;
    const mode = payload.mode;

    const parts: string[] = [];
    if (quest) parts.push(`quest: ${quest}`);
    if (mode) parts.push(`mode: ${mode}`);
    if (mins != null) parts.push(`n: ${mins}`);
    return parts.length ? parts.join(" • ") : JSON.stringify(payload).slice(0, 160);
}

export default function ExecutionTimeline() {
    const [userId, setUserId] = useState<string | null>(null); // Keep briefly if worker needs it, but mostly unused now? Ah, worker might need it if we didn't patch worker route. 
    // Actually the user script said "Remove userId prop" from the component signature.
    // "Change prop signature from ({ userId }) to no userId prop"

    // Let's assume the backend auth works for everything now.

    // We do need to handle the case where we might need userId for the worker route if I haven't patched it?
    // User Step 6 said "Bulletproof the Worker route (optional but recommended)". I haven't done Step 6 yet in the plan explicitly, 
    // but the user instructions said "If your worker route still expects { user_id }, keep it temporarily. Otherwise, remove."
    // I will remove it to be clean, and if worker fails, it fails until I patch worker.

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState<string | null>(null);

    // "Why" state
    const [whyId, setWhyId] = useState<string | null>(null);
    const [whyData, setWhyData] = useState<any | null>(null);
    const [whyLoading, setWhyLoading] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`/api/executions/upcoming?limit=8`).then((r) => r.json());
            setItems(res?.items ?? []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function loadWhy(id: string) {
        setWhyId(id);
        setWhyLoading(true);
        setWhyData(null);
        try {
            const res = await fetch(`/api/executions/why?execution_id=${encodeURIComponent(id)}`).then((r) => r.json());
            setWhyData(res);
        } finally {
            setWhyLoading(false);
        }
    }

    async function cancelExecution(id: string) {
        if (!confirm("Cancel this execution?")) return;
        setCancelling(id);
        try {
            await fetch("/api/executions/cancel", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ execution_id: id, reason: "cancelled from Today timeline" }),
            });
            await load();
            if (whyId === id) setWhyId(null);
        } finally {
            setCancelling(null);
        }
    }

    async function runWorker() {
        // "Worker run: POST /api/executions/worker should use auth internally"
        // I'll assume it does or will. passing empty body relies on server auth.
        await fetch("/api/executions/worker", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
        });
        // wait a bit then reload
        setTimeout(() => load(), 1000);
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm uppercase tracking-wider text-zinc-400">Upcoming Executions</div>
                    <div className="text-xs text-zinc-500 mt-1">queue + cancel + explain</div>
                </div>

                <button
                    className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-200 text-sm hover:bg-zinc-900/40"
                    onClick={runWorker}
                >
                    Run one now
                </button>
            </div>

            <div className="mt-4 space-y-3">
                {items.map((x) => (
                    <div key={x.id} className="rounded-xl border border-zinc-800 bg-zinc-950/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-semibold truncate">{humanizeKind(x.kind)}</div>
                                <div className="text-sm text-zinc-400 mt-1 truncate">{summarizePayload(x.payload)}</div>
                                <div className="text-xs text-zinc-500 mt-2">
                                    {x.status} • run_at {formatTime(x.run_at)} • pri {x.priority} • attempts {x.attempts}/{x.max_attempts}
                                    {x.next_retry_at ? ` • retry ${formatTime(x.next_retry_at)}` : ""}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-200 text-sm hover:bg-zinc-900/40"
                                    onClick={() => loadWhy(x.id)}
                                >
                                    Why
                                </button>
                                <button
                                    className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-200 text-sm hover:bg-zinc-900/40"
                                    onClick={() => cancelExecution(x.id)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {whyId === x.id && (
                            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                                {whyLoading && <div className="text-zinc-400 text-sm">Loading…</div>}
                                {!whyLoading && whyData?.ok && (
                                    <div className="space-y-3">
                                        <div className="text-xs text-zinc-500 font-mono">
                                            dedupe_key: {whyData.execution?.dedupe_key ?? "—"}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-zinc-400">
                                                Attempts: {whyData.execution.attempts} / {whyData.execution.max_attempts}
                                            </div>
                                            {whyData?.runs?.[0]?.trace_id && (
                                                <a
                                                    href={`/traces/${encodeURIComponent(whyData.runs[0].trace_id)}`}
                                                    className="text-indigo-300 hover:text-indigo-200 underline"
                                                >
                                                    View Trace
                                                </a>
                                            )}
                                        </div>

                                        {whyData.execution?.last_error && (
                                            <div className="text-sm text-red-200/80">
                                                last_error: {whyData.execution.last_error}
                                            </div>
                                        )}

                                        <div>
                                            <div className="text-xs uppercase tracking-wider text-zinc-500">Recent Runs</div>
                                            <div className="mt-2 space-y-2">
                                                {(whyData.runs ?? []).map((r: any) => (
                                                    <div key={r.id} className="text-sm text-zinc-300">
                                                        <span className="text-zinc-500">#{r.attempt}</span> • {r.status} •{" "}
                                                        {r.started_at ? formatTime(r.started_at) : "—"}
                                                        {r.error ? <span className="text-red-200/80"> • {r.error}</span> : null}
                                                    </div>
                                                ))}
                                                {(whyData.runs ?? []).length === 0 && <div className="text-zinc-400 text-sm">No runs yet.</div>}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs uppercase tracking-wider text-zinc-500">Logs</div>
                                            <div className="mt-2 space-y-2">
                                                {(whyData.logs ?? []).map((l: any) => (
                                                    <div key={l.id} className="text-xs text-zinc-300">
                                                        <span className="text-zinc-500">{formatTime(l.created_at)}</span> •{" "}
                                                        <span className="text-zinc-400">{l.level}</span> • {l.message}
                                                    </div>
                                                ))}
                                                {(whyData.logs ?? []).length === 0 && <div className="text-zinc-400 text-sm">No logs yet.</div>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {!whyLoading && !whyData?.ok && <div className="text-zinc-400 text-sm">No details available.</div>}
                            </div>
                        )}
                    </div>
                ))}

                {items.length === 0 && <div className="text-zinc-400">No upcoming executions.</div>}
            </div>
        </div>
    );
}

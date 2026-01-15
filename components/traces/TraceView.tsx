"use client";

import { useEffect, useState } from "react";

function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function humanizeKind(kind: string) {
    return kind.replaceAll(".", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function summarizePayload(payload: any) {
    if (!payload) return "—";
    if (typeof payload === "string") return payload.slice(0, 220);
    if (typeof payload !== "object") return String(payload);
    const keys = Object.keys(payload);
    if (!keys.length) return "—";
    return JSON.stringify(payload).slice(0, 260);
}

export default function TraceView({ traceId }: { traceId: string }) {
    const [targetUserId, setTargetUserId] = useState<string | null>(null);
    useEffect(() => {
        const url = new URL(window.location.href);
        const t = url.searchParams.get("target_user_id");
        if (t) setTargetUserId(t);
    }, []);

    const [data, setData] = useState<any | null>(null);
    const [artifacts, setArtifacts] = useState<any | null>(null);
    const [links, setLinks] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // if (!userId) return; // NO LONGER NEEDED
        (async () => {
            setLoading(true);
            try {
                const qs = targetUserId ? `&target_user_id=${encodeURIComponent(targetUserId)}` : "";
                const [res, art, l] = await Promise.all([
                    fetch(`/api/traces/get?trace_id=${encodeURIComponent(traceId)}${qs}`).then((r) => r.json()),
                    fetch(`/api/traces/artifacts?trace_id=${encodeURIComponent(traceId)}${qs}`).then((r) => r.json()),
                    fetch(`/api/traces/links?trace_id=${encodeURIComponent(traceId)}&limit=250${qs}`).then(r => r.json())
                ]);
                setData(res?.ok ? res : null);
                setArtifacts(art?.ok ? art : null);
                setLinks(l?.ok ? l.links : null);
            } finally {
                setLoading(false);
            }
        })();
    }, [traceId, targetUserId]);

    // Removal of the blocking "if (!userId)" check
    // if (!userId) { ... } 

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <div className="text-3xl font-semibold tracking-tight">Trace</div>
                        <div className="text-zinc-400 mt-1 font-mono">{traceId}</div>
                        {targetUserId && <div className="text-xs text-amber-500 mt-1">Viewing as: {targetUserId}</div>}
                    </div>
                    <a
                        className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-200 text-sm hover:bg-zinc-900/40"
                        href={`/bridge`}
                    >
                        Back to Bridge
                    </a>
                    <div className="flex gap-2">
                        <button
                            className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-200 text-sm hover:bg-zinc-900/40"
                            onClick={async () => {
                                // if (!userId) return; // handled by server
                                if (!confirm("Replay this trace in dry-run mode?")) return;

                                const body: any = { trace_id: traceId, dry_run: true, mode: "enqueue_only" };
                                if (targetUserId) body.target_user_id = targetUserId;

                                await fetch("/api/traces/replay", {
                                    method: "POST",
                                    headers: { "content-type": "application/json" },
                                    body: JSON.stringify(body),
                                });
                                alert("Replay enqueued (dry-run). Check Upcoming Executions.");
                            }}
                        >
                            Replay (Dry-run)
                        </button>

                        <button
                            className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-200 text-sm hover:bg-zinc-900/40"
                            onClick={async () => {
                                // handled by server
                                if (!confirm("Replay and immediately run one execution? (Dry-run)")) return;

                                const body: any = { trace_id: traceId, dry_run: true, mode: "enqueue_and_run_one" };
                                if (targetUserId) body.target_user_id = targetUserId;

                                const res = await fetch("/api/traces/replay", {
                                    method: "POST",
                                    headers: { "content-type": "application/json" },
                                    body: JSON.stringify(body),
                                }).then(r => r.json());
                                alert(`Replay enqueued + ran one (dry-run). ran=${res?.ranWorker?.ran ?? false}`);
                            }}
                        >
                            Replay + Run (Dry-run)
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                        <div className="text-sm uppercase tracking-wider text-zinc-400">Executions</div>
                        <div className="mt-4 space-y-3">
                            {loading && <div className="text-zinc-400">Loading…</div>}
                            {!loading && (!data?.executions?.length) && <div className="text-zinc-400">No executions found.</div>}

                            {(data?.executions ?? []).map((e: any) => (
                                <div key={e.id} className="rounded-xl border border-zinc-800 bg-zinc-950/20 p-4">
                                    <div className="font-semibold">{humanizeKind(e.kind)}</div>
                                    <div className="text-xs text-zinc-500 mt-1 font-mono">exec {e.id.slice(0, 8)}</div>
                                    <div className="text-sm text-zinc-400 mt-2">{summarizePayload(e.payload)}</div>
                                    <div className="text-xs text-zinc-500 mt-2">
                                        status {e.status} • pri {e.priority} • dedupe {e.dedupe_key ?? "—"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                        <div className="text-sm uppercase tracking-wider text-zinc-400">Timeline</div>

                        <div className="mt-4 space-y-3">
                            {loading && <div className="text-zinc-400">Loading…</div>}
                            {!loading && (!data?.logs?.length) && <div className="text-zinc-400">No logs recorded for this trace.</div>}

                            {(data?.logs ?? []).map((l: any) => (
                                <div key={l.id} className="rounded-xl border border-zinc-800 bg-zinc-950/20 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm text-zinc-300">
                                            <span className="text-zinc-500">{formatTime(l.created_at)}</span>{" "}
                                            <span className="text-zinc-400">•</span>{" "}
                                            <span className={l.level === "error" ? "text-red-200" : l.level === "warn" ? "text-amber-200" : "text-zinc-200"}>
                                                {l.level}
                                            </span>{" "}
                                            <span className="text-zinc-400">•</span> {l.message}
                                        </div>
                                        <div className="text-xs text-zinc-500 font-mono">{String(l.execution_id).slice(0, 8)}</div>
                                    </div>

                                    {l.meta && Object.keys(l.meta).length > 0 && (
                                        <pre className="mt-3 text-xs text-zinc-300 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                                            {JSON.stringify(l.meta, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/20 p-4">
                            <div className="text-sm uppercase tracking-wider text-zinc-400">Runs</div>
                            <div className="mt-3 space-y-2">
                                {(data?.runs ?? []).map((r: any) => (
                                    <div key={r.id} className="text-sm text-zinc-300">
                                        <span className="text-zinc-500">attempt {r.attempt}</span> • {r.status} •{" "}
                                        {r.started_at ? formatTime(r.started_at) : "—"} → {r.finished_at ? formatTime(r.finished_at) : "—"}
                                        {r.error ? <span className="text-red-200"> • {r.error}</span> : null}
                                    </div>
                                ))}
                                {(data?.runs ?? []).length === 0 && <div className="text-zinc-400">No run records.</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-xs text-zinc-600">
                    Tip: from the Today timeline “Why” panel, we’ll add a “View Trace” button next.
                </div>
            </div>
        </div>
    );
}

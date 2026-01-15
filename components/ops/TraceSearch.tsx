"use client";

import { useEffect, useMemo, useState } from "react";

function toIsoLocal(d: Date) {
    return d.toISOString();
}

export default function TraceSearch() {
    const [q, setQ] = useState("");
    const [kind, setKind] = useState("");
    const [status, setStatus] = useState("");
    const [hasError, setHasError] = useState<string>(""); // "", "true", "false"

    const [since, setSince] = useState<string>(() => {
        const d = new Date(Date.now() - 24 * 3600 * 1000);
        return toIsoLocal(d);
    });
    const [until, setUntil] = useState<string>(() => toIsoLocal(new Date()));

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Optional: check for admin target override
    // In a real app we might fetch this from a context, but here we just read from URL for the "admin view" mode
    const [targetUserId, setTargetUserId] = useState<string | null>(null);
    useEffect(() => {
        const url = new URL(window.location.href);
        const t = url.searchParams.get("target_user_id");
        if (t) setTargetUserId(t);
    }, []);

    const queryUrl = useMemo(() => {
        const u = new URL("/api/traces/search", window.location.origin);
        if (targetUserId) u.searchParams.set("target_user_id", targetUserId);
        if (since) u.searchParams.set("since", since);
        if (until) u.searchParams.set("until", until);
        if (q) u.searchParams.set("q", q);
        if (kind) u.searchParams.set("kind", kind);
        if (status) u.searchParams.set("status", status);
        if (hasError) u.searchParams.set("has_error", hasError);
        u.searchParams.set("limit", "50");
        return u.toString();
    }, [targetUserId, q, kind, status, hasError, since, until]);

    async function runSearch() {
        setLoading(true);
        try {
            const res = await fetch(queryUrl).then((r) => r.json());
            setItems(res?.items ?? []);
        } finally {
            setLoading(false);
        }
    }

    // Load once on mount (no longer blocked by userId)
    useEffect(() => {
        runSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once or when targetUserId changes if we wanted, but we set targetUserId once

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <div className="text-3xl font-semibold tracking-tight">Trace Search</div>
                        <div className="text-zinc-400 mt-1">Find incidents, drill in, replay safely.</div>
                        {targetUserId && <div className="text-xs text-amber-500 mt-1">Viewing as: {targetUserId}</div>}
                    </div>
                    <a
                        className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-200 text-sm hover:bg-zinc-900/40"
                        href={`/bridge`}
                    >
                        Back to Bridge
                    </a>
                </div>

                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-4">
                            <label className="text-xs text-zinc-500">Query</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="error text or log message..."
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-xs text-zinc-500">Kind</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm"
                                value={kind}
                                onChange={(e) => setKind(e.target.value)}
                                placeholder="email.flush"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-xs text-zinc-500">Run status</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                placeholder="failed"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-xs text-zinc-500">Has error</label>
                            <select
                                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm"
                                value={hasError}
                                onChange={(e) => setHasError(e.target.value)}
                            >
                                <option value="">any</option>
                                <option value="true">true</option>
                                <option value="false">false</option>
                            </select>
                        </div>

                        <div className="md:col-span-6">
                            <label className="text-xs text-zinc-500">Since (ISO)</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm font-mono"
                                value={since}
                                onChange={(e) => setSince(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-6">
                            <label className="text-xs text-zinc-500">Until (ISO)</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm font-mono"
                                value={until}
                                onChange={(e) => setUntil(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-12 flex justify-end gap-2 mt-2">
                            <button
                                className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/20 text-zinc-200 text-sm hover:bg-zinc-900/40"
                                onClick={runSearch}
                            >
                                {loading ? "Searching…" : "Search"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                    <div className="text-sm uppercase tracking-wider text-zinc-400">Results</div>

                    <div className="mt-4 space-y-3">
                        {items.length === 0 && !loading && <div className="text-zinc-400">No traces found.</div>}

                        {items.map((t) => (
                            <a
                                key={t.trace_id}
                                className="block rounded-xl border border-zinc-800 bg-zinc-950/20 p-4 hover:bg-zinc-900/30"
                                href={`/traces/${encodeURIComponent(t.trace_id)}${targetUserId ? `?target_user_id=${encodeURIComponent(targetUserId)}` : ""}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="font-mono text-sm text-zinc-200 truncate">{t.trace_id}</div>
                                        <div className="text-xs text-zinc-500 mt-1">
                                            kinds: {t.kinds ?? "—"}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-1">
                                            runs {t.run_count} • failed {t.failed_count} • last_status {t.last_status ?? "—"}
                                        </div>
                                        {t.last_error && <div className="text-xs text-red-200/80 mt-2 truncate">last_error: {t.last_error}</div>}
                                    </div>

                                    <div className="text-xs text-zinc-500 text-right">
                                        <div>first: {t.first_started_at ? new Date(t.first_started_at).toLocaleString() : "—"}</div>
                                        <div>last: {t.last_finished_at ? new Date(t.last_finished_at).toLocaleString() : "—"}</div>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

                <div className="mt-6 text-xs text-zinc-600">
                    Tip: open a trace, then hit “Replay (Dry-run)” to reproduce safely.
                </div>
            </div>
        </div>
    );
}

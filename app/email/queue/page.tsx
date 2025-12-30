"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type OutboxItem = {
    id: string;
    to_email: string | null;
    to_name: string | null;
    subject: string | null;
    body: string | null;
    status: string | null;
    approval_status: "pending" | "approved" | "deferred" | "dismissed" | string;
    approved_at: string | null;
    dismissed_at: string | null;
    defer_until: string | null;
    created_at: string | null;
};

type ApiResp = { ok: boolean; items?: OutboxItem[]; error?: string; detail?: string };

export default function EmailQueuePage() {
    const [items, setItems] = useState<OutboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    async function refresh() {
        setLoading(true);
        setErr(null);
        try {
            const r = await fetch("/api/email/outbox/pending", { cache: "no-store" });
            const j: ApiResp = await r.json();
            if (!j.ok) throw new Error(j.detail || j.error || "Failed to load queue");
            setItems(j.items ?? []);
        } catch (e: any) {
            setErr(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const pending = useMemo(
        () => items.filter((x) => x.approval_status === "pending"),
        [items]
    );
    const deferred = useMemo(
        () => items.filter((x) => x.approval_status === "deferred"),
        [items]
    );

    async function act(
        outbox_id: string,
        action: "approve" | "defer" | "dismiss",
        extra?: { defer_until?: string; note?: string }
    ) {
        setBusyId(outbox_id);
        try {
            const r = await fetch("/api/email/outbox/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ outbox_id, action, ...(extra ?? {}) }),
            });
            const j = await r.json();
            if (!r.ok || !j.ok) throw new Error(j.detail || j.error || "Action failed");
            await refresh();
        } catch (e: any) {
            alert(e?.message ?? String(e));
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="p-6 space-y-6 bg-black min-h-screen text-white">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Email Approval Queue</h1>
                    <p className="text-sm opacity-80 text-gray-400">
                        Pulse is holding emails for your approval. Nothing sends without you.
                    </p>
                </div>
                <Link className="text-sm underline opacity-90 hover:opacity-100 text-cyan-400" href="/">
                    Back to Home
                </Link>
            </div>

            {loading && (
                <div className="rounded-xl border border-white/10 p-4">
                    <div className="text-sm opacity-80 animate-pulse">Loading queue…</div>
                </div>
            )}

            {err && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <div className="text-sm text-red-400">Failed to load: {err}</div>
                    <button
                        className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
                        onClick={refresh}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !err && items.length === 0 && (
                <div className="rounded-xl border border-white/10 p-6">
                    <div className="text-lg font-medium">Nothing waiting for approval.</div>
                    <div className="text-sm opacity-80 mt-1">
                        When Pulse drafts or queues emails, they’ll show up here.
                    </div>
                </div>
            )}

            {!loading && !err && pending.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-green-400">Pending</h2>
                    <div className="grid gap-3">
                        {pending.map((x) => (
                            <Card
                                key={x.id}
                                item={x}
                                busy={busyId === x.id}
                                onApprove={() => act(x.id, "approve")}
                                onDismiss={() => act(x.id, "dismiss")}
                                onDefer={() => act(x.id, "defer")}
                            />
                        ))}
                    </div>
                </section>
            )}

            {!loading && !err && deferred.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-yellow-500">Deferred</h2>
                    <div className="grid gap-3">
                        {deferred.map((x) => (
                            <Card
                                key={x.id}
                                item={x}
                                busy={busyId === x.id}
                                onApprove={() => act(x.id, "approve")}
                                onDismiss={() => act(x.id, "dismiss")}
                                onDefer={() =>
                                    act(x.id, "defer", {
                                        // bump another 24h by default
                                        defer_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                                    })
                                }
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function Card({
    item,
    busy,
    onApprove,
    onDefer,
    onDismiss,
}: {
    item: OutboxItem;
    busy: boolean;
    onApprove: () => void;
    onDefer: () => void;
    onDismiss: () => void;
}) {
    const to = item.to_name ? `${item.to_name} <${item.to_email ?? ""}>` : item.to_email ?? "(no recipient)";
    const subject = item.subject ?? "(no subject)";
    const body = item.body ?? "";

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 hover:border-cyan-500/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-sm opacity-80 text-gray-400">To: {to}</div>
                    <div className="font-semibold truncate text-white">{subject}</div>
                </div>
                <div className="text-xs opacity-70 whitespace-nowrap bg-gray-800 px-2 py-1 rounded">
                    {item.approval_status.toUpperCase()}
                </div>
            </div>

            <div className="text-sm opacity-90 whitespace-pre-wrap line-clamp-6 text-gray-300 font-mono bg-black/20 p-2 rounded">
                {body.length > 800 ? body.slice(0, 800) + "…" : body}
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    disabled={busy}
                    onClick={onApprove}
                    className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                >
                    Approve
                </button>
                <button
                    disabled={busy}
                    onClick={onDefer}
                    className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50"
                >
                    Defer 24h
                </button>
                <button
                    disabled={busy}
                    onClick={onDismiss}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}

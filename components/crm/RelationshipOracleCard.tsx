"use client";

import { useEffect, useMemo, useState } from "react";

type DueFollowup = {
    id: string;
    contact_id: string;
    due_at: string;
    reason: string | null;
    suggested_action: string | null;
    source: string;
    score: number | null;
    risk_level: "ok" | "watch" | "at_risk" | null;
    days_since_last_interaction: number | null;
};

type RiskContact = {
    contact_id: string;
    score: number;
    risk_level: "watch" | "at_risk";
    last_interaction_at: string | null;
    open_followups: number;
    days_since_last_interaction: number | null;
    updated_at: string;
};

type Bundle = {
    due_followups: DueFollowup[];
    at_risk_contacts: RiskContact[];
};

export function RelationshipOracleCard() {
    const [bundle, setBundle] = useState<Bundle>({ due_followups: [], at_risk_contacts: [] });
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch("/api/crm/oracle?limit=20", { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data = (await res.json()) as Bundle;
            setBundle(data);
        } catch (e: any) {
            setErr(e?.message ?? "Failed to load CRM oracle");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const due = bundle.due_followups ?? [];
    const risk = bundle.at_risk_contacts ?? [];

    const headline = useMemo(() => {
        if (loading) return "Relationship Oracle";
        if (err) return "Relationship Oracle (error)";
        if (due.length === 0 && risk.length === 0) return "Relationship Oracle (all clear)";
        return "Relationship Oracle";
    }, [loading, err, due.length, risk.length]);

    async function markDone(followup_id: string) {
        const res = await fetch("/api/crm/followups/mark-done", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ followup_id }),
        });
        if (!res.ok) throw new Error(await res.text());
        await load();
    }

    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-lg font-semibold">{headline}</div>
                    <div className="text-sm text-gray-500">
                        Follow-ups due + contacts at risk (score + recency).
                    </div>
                </div>
                <button
                    className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50"
                    onClick={() => load()}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            {err ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border p-3">
                    <div className="mb-2 text-sm font-semibold">Due follow-ups</div>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : due.length === 0 ? (
                        <div className="text-sm text-gray-500">No follow-ups due.</div>
                    ) : (
                        <div className="space-y-2">
                            {due.slice(0, 10).map((f) => (
                                <div key={f.id} className="rounded-xl border p-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium">
                                            Contact: <span className="font-mono text-xs">{f.contact_id}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{new Date(f.due_at).toLocaleString()}</div>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600">
                                        {f.suggested_action ?? f.reason ?? "Follow up"}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                            Risk: {f.risk_level ?? "—"} • Score: {f.score ?? "—"} • Days since:{" "}
                                            {f.days_since_last_interaction ?? "—"}
                                        </div>
                                        <button
                                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                                            onClick={() => markDone(f.id)}
                                        >
                                            Mark done
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border p-3">
                    <div className="mb-2 text-sm font-semibold">At-risk / Watch list</div>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : risk.length === 0 ? (
                        <div className="text-sm text-gray-500">Nobody is at risk.</div>
                    ) : (
                        <div className="space-y-2">
                            {risk.slice(0, 10).map((r) => (
                                <div key={r.contact_id} className="rounded-xl border p-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium">
                                            Contact: <span className="font-mono text-xs">{r.contact_id}</span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {r.risk_level.toUpperCase()} • {r.score}
                                        </div>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        Last: {r.last_interaction_at ? new Date(r.last_interaction_at).toLocaleDateString() : "—"} •
                                        Open followups: {r.open_followups} • Days since: {r.days_since_last_interaction ?? "—"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

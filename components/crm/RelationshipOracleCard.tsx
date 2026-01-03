"use client";

import * as React from "react";
import { fetchRelationshipOracle, RelationshipOracleRow } from "@/lib/crm/oracle";

function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
}

function daysSince(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const ms = Date.now() - d.getTime();
    const days = Math.max(0, Math.floor(ms / 86400000));
    return `${days}d`;
}

function riskPill(risk: string | null) {
    const v = (risk ?? "unknown").toLowerCase();
    const base = "text-xs px-2 py-0.5 rounded-full border";
    if (v === "high") return <span className={`${base} border-red-500/40 text-red-200`}>High</span>;
    if (v === "medium") return <span className={`${base} border-yellow-500/40 text-yellow-200`}>Med</span>;
    if (v === "low") return <span className={`${base} border-green-500/40 text-green-200`}>Low</span>;
    return <span className={`${base} border-zinc-600 text-zinc-200`}>Unknown</span>;
}

export default function RelationshipOracleCard() {
    const [rows, setRows] = React.useState<RelationshipOracleRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [err, setErr] = React.useState<string | null>(null);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                setErr(null);
                const data = await fetchRelationshipOracle(25);
                if (!mounted) return;
                setRows(data);
            } catch (e: any) {
                if (!mounted) return;
                setErr(e?.message ?? "Failed to load relationship oracle");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-semibold text-zinc-100">Relationship Oracle</div>
                    <div className="text-xs text-zinc-400">Top relationships by score (with last touch + risk)</div>
                </div>
                <button
                    className="text-xs rounded-lg border border-zinc-800 px-2 py-1 text-zinc-200 hover:bg-zinc-900"
                    onClick={async () => {
                        try {
                            setLoading(true);
                            setErr(null);
                            const data = await fetchRelationshipOracle(25);
                            setRows(data);
                        } catch (e: any) {
                            setErr(e?.message ?? "Failed to refresh");
                        } finally {
                            setLoading(false);
                        }
                    }}
                >
                    Refresh
                </button>
            </div>

            <div className="mt-4">
                {loading ? (
                    <div className="text-sm text-zinc-400">Loading…</div>
                ) : err ? (
                    <div className="text-sm text-red-300">{err}</div>
                ) : rows.length === 0 ? (
                    <div className="text-sm text-zinc-400">
                        No relationships yet. Add an interaction to seed the Oracle.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rows.map((r) => (
                            <div
                                key={r.contact_id}
                                className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="truncate text-sm font-medium text-zinc-100">
                                            {r.full_name ?? "Unnamed"}
                                        </div>
                                        {riskPill(r.risk_level)}
                                    </div>
                                    <div className="truncate text-xs text-zinc-400">
                                        {(r.company ?? "—") + " • " + (r.title ?? "—")}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pl-3">
                                    <div className="text-right">
                                        <div className="text-xs text-zinc-400">Last touch</div>
                                        <div className="text-sm text-zinc-100">{fmtDate(r.last_interaction_at)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-zinc-400">Days</div>
                                        <div className="text-sm text-zinc-100">{daysSince(r.last_interaction_at)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-zinc-400">Score</div>
                                        <div className="text-sm text-zinc-100">
                                            {typeof r.relationship_score === "number" ? r.relationship_score : "—"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

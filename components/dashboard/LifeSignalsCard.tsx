"use client";

import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

type Signals = {
    day: string;
    xp: number;
    momentum: number;
    life_score: number;
    nudges: Array<{ id: string; title: string; body: string; severity: string; shown_at: string | null }>;
    alerts: Array<{ id: string; rollup_key: string; risk: number; reason: string }>;
    history: Array<{ day: string; xp: number; momentum: number; life_score: number }>; // Bundle
    attribution: Array<{ rollup_key: string; value: number; weight: number; contribution: number; contribution_pct: number }>;
};

export function LifeSignalsCard() {
    const [data, setData] = useState<Signals | null>(null);

    useEffect(() => {
        fetch("/api/signals/daily?days=30")
            .then((r) => r.json())
            .then(setData)
            .catch(() => setData(null));
    }, []);

    // Mark nudges as shown once they render (best-effort)
    useEffect(() => {
        if (!data?.nudges?.length) return;
        data.nudges
            .filter((n) => !n.shown_at)
            .slice(0, 3)
            .forEach((n) => {
                fetch("/api/nudges/action", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nudge_id: n.id, action: "shown" }),
                }).catch(() => { });
            });
    }, [data?.nudges]);

    if (!data) return null;

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-sm text-white/60">Today</div>
                    <div className="text-xl font-semibold">Life Signals</div>
                </div>
                <div className="text-sm text-white/60">{data.day}</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
                <Metric label="XP" value={Math.round(data.xp)} />
                <Metric label="Momentum" value={Math.round(data.momentum)} />
                <Metric label="Life Score" value={Math.round(data.life_score)} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
                <Spark label="XP (30d)" data={data.history} dataKey="xp" />
                <Spark label="Momentum (30d)" data={data.history} dataKey="momentum" />
                <Spark label="Life Score (30d)" data={data.history} dataKey="life_score" />
            </div>

            {(data.alerts?.length ?? 0) > 0 && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                    <div className="text-sm font-medium text-red-200">Predictive Alerts</div>
                    <div className="mt-2 space-y-2">
                        {data.alerts.slice(0, 3).map((a) => (
                            <div key={a.id} className="text-sm">
                                <span className="font-medium text-white">{prettyKey(a.rollup_key)}</span>{" "}
                                <span className="text-white/60">
                                    risk {Math.round(a.risk * 100)}% — {a.reason}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(data.attribution?.length ?? 0) > 0 && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-sm font-medium text-white">What moved my score today?</div>
                    <div className="mt-2 space-y-2">
                        {data.attribution.slice(0, 5).map((a) => (
                            <div key={a.rollup_key} className="flex items-center justify-between text-sm">
                                <div>
                                    <div className="font-medium text-white">{prettyKey(a.rollup_key)}</div>
                                    <div className="text-white/60">
                                        value {round(a.value)} × weight {round(a.weight)}
                                    </div>
                                </div>
                                <div className="text-white/60">
                                    {Math.round(a.contribution_pct * 100)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(data.nudges?.length ?? 0) > 0 && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-sm font-medium text-white">Nudges</div>
                    <div className="mt-2 space-y-3">
                        {data.nudges.slice(0, 3).map((n) => (
                            <div key={n.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {n.title}{" "}
                                            <span className="ml-2 text-xs text-white/50">
                                                {n.severity}
                                            </span>
                                        </div>
                                        <div className="text-sm text-white/60">{n.body}</div>
                                    </div>
                                    <button
                                        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white hover:bg-white/10"
                                        onClick={() => dismissNudge(n.id, setData)}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-xs text-white/60">{label}</div>
            <div className="text-lg font-semibold text-white">{value}</div>
        </div>
    );
}

function Spark({ label, data, dataKey }: { label: string; data: any[]; dataKey: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60">{label}</div>
            <div className="mt-2 h-14">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <XAxis dataKey="day" hide />
                        <Tooltip />
                        <Line type="monotone" dataKey={dataKey} dot={false} stroke="#fff" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}



function prettyKey(s: string) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function round(n: number) {
    return Math.round(n * 10) / 10;
}

async function dismissNudge(id: string, setData: any) {
    try {
        await fetch("/api/nudges/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nudge_id: id, action: "dismiss" }),
        });
        setData((prev: Signals | null) => {
            if (!prev) return prev;
            return { ...prev, nudges: prev.nudges.filter((n) => n.id !== id) };
        });
    } catch { }
}

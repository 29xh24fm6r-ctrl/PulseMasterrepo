"use client";

import { useEffect, useMemo, useState } from "react";

type XpState = {
    user_id: string;
    total_xp: number | string;
    today_xp: number;
    streak_days: number;
    streak_last_day: string | null;
};

function asNum(x: any) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
}

function levelFromTotal(total: number) {
    // Simple curve: level grows every 250xp + increasing requirement
    // level 1 starts at 0
    let level = 1;
    let remaining = total;
    let req = 250;

    while (remaining >= req) {
        remaining -= req;
        level += 1;
        req = Math.floor(req * 1.12);
    }

    const progress = req === 0 ? 0 : remaining / req;
    return { level, req, remaining, progress };
}

export default function XpStreakCard() {
    const [state, setState] = useState<XpState | null>(null);

    async function refresh() {
        const r = await fetch("/api/xp/state", { cache: "no-store" });
        const j = await r.json();
        if (r.ok) setState(j.state);
    }

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 8000); // lightweight polling
        return () => clearInterval(t);
    }, []);

    const total = asNum(state?.total_xp);
    const today = asNum(state?.today_xp);
    const streak = asNum(state?.streak_days);

    const lvl = useMemo(() => levelFromTotal(total), [total]);

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-medium uppercase tracking-wide opacity-70 text-cyan-400">Momentum</div>
                    <div className="mt-1 text-lg font-semibold text-white">Streak: {streak} day{streak === 1 ? "" : "s"}</div>
                    <div className="mt-1 text-sm opacity-70 text-gray-400">Today: {today} XP</div>
                </div>

                <div className="text-right">
                    <div className="text-xs font-medium uppercase tracking-wide opacity-70 text-cyan-400">Level</div>
                    <div className="mt-1 text-lg font-semibold text-white">{lvl.level}</div>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between text-xs opacity-70 text-gray-400">
                    <span>{lvl.remaining} / {lvl.req} XP</span>
                    <span>Total: {total}</span>
                </div>

                <div className="mt-2 h-2 w-full rounded-full border border-white/10 bg-white/5 overflow-hidden">
                    <div
                        className="h-2 rounded-full bg-cyan-500"
                        style={{ width: `${Math.max(0, Math.min(100, lvl.progress * 100))}%` }}
                    />
                </div>
            </div>

            <div className="mt-3 text-xs opacity-60 text-gray-500">
                Complete tasks to earn XP. Higher-priority completions earn bonus XP.
            </div>
        </div>
    );
}

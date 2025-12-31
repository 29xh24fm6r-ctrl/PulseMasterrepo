"use client";

import { useEffect, useState } from "react";

type Quest = {
    id: string;
    quest_key: string;
    title: string;
    description: string | null;
    target: number;
    progress: number;
    is_completed: boolean;
    reward_xp: number;
    meta: any;
};

export default function DailyQuestsCard() {
    const [day, setDay] = useState<string>("");
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        setLoading(true);
        try {
            const r = await fetch("/api/quests/today", { cache: "no-store" });
            const j = await r.json();
            if (r.ok) {
                setDay(j.day);
                setQuests(j.quests ?? []);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 12000);
        return () => clearInterval(t);
    }, []);

    async function claim(q: Quest) {
        const r = await fetch("/api/quests/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quest_id: q.id }),
        });
        await r.json();
        await refresh();
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-xs font-medium uppercase tracking-wide opacity-70 text-cyan-400">Daily Quests</div>
                    <div className="mt-1 text-sm opacity-70 text-gray-400">{day ? `UTC Day: ${day}` : ""}</div>
                </div>
                <button onClick={refresh} className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white hover:bg-white/5 transition">
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="mt-3 text-sm opacity-70 text-gray-500">Loading quests…</div>
            ) : (
                <div className="mt-3 grid gap-2">
                    {quests.map((q) => {
                        const claimed = !!q.meta?.claimed;
                        const pct = q.target ? Math.min(100, Math.round((q.progress / q.target) * 100)) : 0;

                        return (
                            <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/20 transition">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-white">{q.title}</div>
                                        {q.description ? <div className="mt-1 text-xs opacity-70 text-gray-400">{q.description}</div> : null}
                                    </div>
                                    <div className="text-xs opacity-70 text-cyan-300 font-medium">{q.reward_xp} XP</div>
                                </div>

                                {q.meta?.why ? (
                                    <div className="mt-2 text-xs opacity-60 text-gray-500 italic">
                                        Why: {q.meta.why}
                                    </div>
                                ) : null}

                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs opacity-70 text-gray-400">
                                        <span>
                                            {q.progress}/{q.target}
                                        </span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="mt-2 h-2 w-full rounded-full border border-white/10 bg-white/5 overflow-hidden">
                                        <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>

                                <div className="mt-3 flex gap-2">
                                    {q.is_completed ? (
                                        <button
                                            disabled={claimed}
                                            onClick={() => claim(q)}
                                            className="rounded-xl border border-white/15 px-3 py-2 text-xs disabled:opacity-50 text-green-400 hover:bg-white/5 transition"
                                        >
                                            {claimed ? "Claimed" : "Claim Reward"}
                                        </button>
                                    ) : (
                                        <div className="text-xs opacity-60 text-gray-500">Complete the objective to unlock reward.</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

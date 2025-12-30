"use client";

import { useEffect, useMemo, useState } from "react";

type FeedItem = {
    id: string;
    title: string;
    description: string | null;
    status: "pending" | "active" | "blocked" | "completed" | "archived";
    priority: number;
    context: string | null;
    source: string | null;
    due_at: string | null;
    defer_until: string | null;
    blocked_reason: string | null;
    is_deferred: boolean;
    is_overdue: boolean;
    seconds_until_due: number | null;
    created_at: string;
    updated_at: string;
};

function fmtDue(due_at: string | null) {
    if (!due_at) return "No due date";
    const d = new Date(due_at);
    return d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtContext(x: string | null) {
    if (!x) return null;
    return x.length > 22 ? x.slice(0, 22) + "…" : x;
}

export default function ExecutionTimeline() {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [newTitle, setNewTitle] = useState("");
    const [whenText, setWhenText] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [creating, setCreating] = useState(false);
    const [triaging, setTriaging] = useState(false);

    const [focusEnabled, setFocusEnabled] = useState(false);
    const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
    const [prefsLoading, setPrefsLoading] = useState(true);

    async function refresh() {
        setErr(null);
        setLoading(true);
        try {
            const r = await fetch(`/api/tasks/execution?limit=10`, { cache: "no-store" });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error ?? "failed");
            setItems(j.items ?? []);
        } catch (e: any) {
            setErr(e?.message ?? "failed");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        (async () => {
            await refresh();
            try {
                const r = await fetch("/api/prefs", { cache: "no-store" });
                const j = await r.json();
                if (r.ok) {
                    setFocusEnabled(!!j?.prefs?.focus_mode_enabled);
                    setFocusTaskId(j?.prefs?.active_focus_task_id ?? null);
                }
            } finally {
                setPrefsLoading(false);
            }
        })();
    }, []);

    const next = items[0] ?? null;
    const upcoming = useMemo(() => items.slice(1, 6), [items]);

    const focusTask = useMemo(() => {
        if (!focusTaskId) return null;
        return items.find((x) => x.id === focusTaskId) ?? null;
    }, [items, focusTaskId]);

    async function savePrefs(nextEnabled: boolean, nextTaskId: string | null) {
        setFocusEnabled(nextEnabled);
        setFocusTaskId(nextTaskId);
        try {
            const r = await fetch("/api/prefs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ focus_mode_enabled: nextEnabled, active_focus_task_id: nextTaskId ?? null }),
            });
            const j = await r.json();
            if (r.ok) {
                setFocusEnabled(!!j?.prefs?.focus_mode_enabled);
                setFocusTaskId(j?.prefs?.active_focus_task_id ?? null);
            }
        } catch (e) {
            console.error("Failed to save prefs", e);
        }
    }

    async function act(payload: any) {
        const r = await fetch("/api/tasks/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.detail ?? j?.error ?? "action_failed");
        await refresh();
    }

    async function createTask(run_ai_triage: boolean) {
        if (!newTitle.trim()) return;

        setCreating(true);
        try {
            const r = await fetch("/api/tasks/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    description: newDesc.trim() ? newDesc.trim() : null,
                    source: run_ai_triage ? "ai" : "manual",
                    run_ai_triage,
                    nlp_when: whenText.trim() ? whenText.trim() : null,
                }),
            });

            const j = await r.json();
            if (!r.ok) throw new Error(j?.detail ?? j?.error ?? "create_failed");

            setNewTitle("");
            setNewDesc("");
            setWhenText("");

            if (j.run_ai_triage) {
                setTriaging(true);
                const t = j.item;
                const r2 = await fetch("/api/tasks/triage", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ task_id: t.id }),
                });
                const j2 = await r2.json();
                if (!r2.ok) throw new Error(j2?.detail ?? j2?.error ?? "triage_failed");
            }

            await refresh();
        } finally {
            setCreating(false);
            setTriaging(false);
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm opacity-70 text-gray-400">Loading execution timeline…</div>
            </div>
        );
    }

    if (err) {
        return (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                <div className="text-sm text-red-500">Execution feed error: {err}</div>
                <button onClick={refresh} className="mt-3 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5 text-white">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {/* Focus Mode Toggle */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-white">Focus Mode</div>
                        <div className="text-xs opacity-70 text-gray-400">Lock your dashboard to one task until you finish or stop.</div>
                    </div>

                    <button
                        disabled={prefsLoading}
                        onClick={() => savePrefs(!focusEnabled, focusTaskId)}
                        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition"
                    >
                        {focusEnabled ? "On" : "Off"}
                    </button>
                </div>

                {focusEnabled ? (
                    <div className="mt-3 text-xs opacity-70 text-gray-400">
                        {focusTaskId ? "Locked to a focus task." : "No focus task selected yet — choose one below."}
                    </div>
                ) : null}
            </div>

            {focusEnabled ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
                    <div className="text-xs font-medium uppercase tracking-wide opacity-70 text-cyan-400">Focus</div>

                    {focusTask ? (
                        <div className="mt-2">
                            <div className="text-2xl font-semibold text-white">{focusTask.title}</div>
                            {focusTask.description ? <div className="mt-2 text-sm opacity-80 text-gray-400">{focusTask.description}</div> : null}

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-70 text-gray-400">
                                <span className="rounded-full border border-white/20 px-2 py-1">{focusTask.status}</span>
                                <span className="rounded-full border border-white/20 px-2 py-1">priority {focusTask.priority}</span>
                                {focusTask.context ? <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-purple-400">{fmtContext(focusTask.context)}</span> : null}
                                <span className="rounded-full border border-white/20 px-2 py-1">{fmtDue(focusTask.due_at)}</span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    onClick={() => act({ action: "complete", task_id: focusTask.id })}
                                    className="rounded-xl bg-cyan-500 px-4 py-2 text-sm text-black hover:bg-cyan-400 transition"
                                >
                                    Complete Focus Task
                                </button>

                                <button
                                    onClick={() => {
                                        const d = new Date();
                                        d.setHours(d.getHours() + 2);
                                        act({ action: "snooze", task_id: focusTask.id, defer_until: d.toISOString() });
                                    }}
                                    className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 transition"
                                >
                                    Snooze 2h
                                </button>

                                <button
                                    onClick={() => savePrefs(true, null)}
                                    className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 transition"
                                >
                                    Choose different focus task
                                </button>

                                <button
                                    onClick={() => savePrefs(false, null)}
                                    className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 transition"
                                >
                                    Exit Focus Mode
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-3 text-sm opacity-70 text-gray-400">
                            Pick a focus task from Upcoming (below) by clicking “Set Focus”.
                        </div>
                    )}
                </div>
            ) : null}

            {!focusEnabled ? (
                <>
                    {/* Quick Add */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
                        <div className="text-xs font-medium uppercase tracking-wide opacity-70 text-cyan-400">Create Task</div>

                        <div className="mt-3 grid gap-2">
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="What do you need to do?"
                                className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none text-white focus:border-cyan-500 transition placeholder:text-gray-600"
                            />
                            <input
                                value={whenText}
                                onChange={(e) => setWhenText(e.target.value)}
                                placeholder='When? (e.g., "tomorrow 3pm", "next Monday", "in 2 hours")'
                                className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none text-white focus:border-cyan-500 transition placeholder:text-gray-600"
                            />
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Optional details…"
                                className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none text-white focus:border-cyan-500 transition placeholder:text-gray-600 resize-none"
                                rows={2}
                            />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                disabled={creating || !newTitle.trim()}
                                onClick={() => createTask(false)}
                                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition"
                            >
                                Add
                            </button>

                            <button
                                disabled={creating || triaging || !newTitle.trim()}
                                onClick={() => createTask(true)}
                                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm text-black hover:bg-cyan-400 disabled:opacity-50 transition font-medium"
                            >
                                {triaging ? "AI triaging…" : "Add + AI Triage"}
                            </button>

                            <button onClick={refresh} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
                                Refresh
                            </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                onClick={() => setWhenText("today 5pm")}
                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition"
                            >
                                Today 5pm
                            </button>
                            <button
                                onClick={() => setWhenText("tomorrow 9am")}
                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition"
                            >
                                Tomorrow AM
                            </button>
                            <button
                                onClick={() => setWhenText("tomorrow 3pm")}
                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition"
                            >
                                Tomorrow PM
                            </button>
                            <button
                                onClick={() => setWhenText("next week")}
                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition"
                            >
                                Next Week
                            </button>
                            <button
                                onClick={() => setWhenText("in 2 hours")}
                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition"
                            >
                                Snooze 2h
                            </button>
                            <button
                                onClick={() => setWhenText("tomorrow")}
                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition"
                            >
                                Tomorrow
                            </button>
                        </div>

                        <div className="mt-2 text-xs opacity-60 text-gray-500">
                            AI triage sets priority/context/due/defer/status using canonical fields, then your task immediately flows into the execution feed.
                        </div>
                    </div>

                    {/* Next Execution */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-xs font-medium uppercase tracking-wide opacity-70 text-cyan-400">Next Execution</div>
                                <div className="mt-1 text-xl font-semibold text-white">
                                    {next ? next.title : "You’re clear. No executions right now."}
                                </div>
                                {next?.description ? <div className="mt-2 text-sm opacity-80 text-gray-400">{next.description}</div> : null}
                                {next ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-70 text-gray-400">
                                        <span className="rounded-full border border-white/20 px-2 py-1">{next.status}</span>
                                        <span className="rounded-full border border-white/20 px-2 py-1">priority {next.priority}</span>
                                        {next.is_overdue ? <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-400">overdue</span> : null}
                                        {next.context ? <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-purple-400">{fmtContext(next.context)}</span> : null}
                                        <span className="rounded-full border border-white/20 px-2 py-1">{fmtDue(next.due_at)}</span>
                                    </div>
                                ) : null}
                            </div>

                            {next ? (
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => act({ action: "complete", task_id: next.id })}
                                        className="rounded-xl bg-cyan-500 px-4 py-2 text-sm text-black hover:bg-cyan-400 transition"
                                    >
                                        Complete
                                    </button>

                                    <button
                                        onClick={() => {
                                            const d = new Date();
                                            d.setHours(d.getHours() + 2);
                                            act({ action: "snooze", task_id: next.id, defer_until: d.toISOString() });
                                        }}
                                        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 transition"
                                    >
                                        Snooze 2h
                                    </button>

                                    <button
                                        onClick={() => act({ action: "block", task_id: next.id, reason: "Blocked — needs input" })}
                                        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 transition"
                                    >
                                        Block
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {next?.status === "blocked" && next.blocked_reason ? (
                            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
                                <div className="text-xs font-medium uppercase tracking-wide opacity-70 text-red-400">Blocked reason</div>
                                <div className="mt-1 text-white">{next.blocked_reason}</div>
                                <button
                                    onClick={() => act({ action: "activate", task_id: next.id })}
                                    className="mt-3 rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/5"
                                >
                                    Mark unblocked
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {/* Upcoming Executions */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-white">Upcoming Executions</div>
                        </div>

                        {upcoming.length === 0 ? (
                            <div className="mt-3 text-sm opacity-70 text-gray-500">No upcoming items.</div>
                        ) : (
                            <div className="mt-3 grid gap-2">
                                {upcoming.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 hover:border-white/20 p-3 transition">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-white">{t.title}</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-70 text-gray-400">
                                                <span className="rounded-full border border-white/15 px-2 py-1">{t.status}</span>
                                                <span className="rounded-full border border-white/15 px-2 py-1">{fmtDue(t.due_at)}</span>
                                                {t.is_overdue ? <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-400">overdue</span> : null}
                                                {t.context ? <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-purple-400">{fmtContext(t.context)}</span> : null}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                onClick={() => act({ action: "complete", task_id: t.id })}
                                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-green-400 hover:bg-white/5 transition"
                                            >
                                                Complete
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const d = new Date();
                                                    d.setDate(d.getDate() + 1);
                                                    act({ action: "snooze", task_id: t.id, defer_until: d.toISOString() });
                                                }}
                                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-yellow-400 hover:bg-white/5 transition"
                                            >
                                                Snooze 1d
                                            </button>
                                            <button
                                                onClick={() => savePrefs(true, t.id)}
                                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-cyan-400 hover:bg-white/5 transition"
                                            >
                                                Set Focus
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Still show Upcoming so user can pick focus if none */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-white">Upcoming (Pick a Focus Task)</div>
                        </div>

                        {upcoming.length === 0 ? (
                            <div className="mt-3 text-sm opacity-70 text-gray-500">No upcoming items.</div>
                        ) : (
                            <div className="mt-3 grid gap-2">
                                {upcoming.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 hover:border-white/20 p-3 transition">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-white">{t.title}</div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-70 text-gray-400">
                                                <span className="rounded-full border border-white/15 px-2 py-1">{t.status}</span>
                                                <span className="rounded-full border border-white/15 px-2 py-1">{fmtDue(t.due_at)}</span>
                                                {t.is_overdue ? <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-400">overdue</span> : null}
                                                {t.context ? <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-purple-400">{fmtContext(t.context)}</span> : null}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                onClick={() => savePrefs(true, t.id)}
                                                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-cyan-400 hover:bg-white/5 transition"
                                            >
                                                Set Focus
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { chefClient } from "@/lib/chef/client";

function fmtMinutes(n: number | null) {
    if (n == null) return "—";
    if (n <= 0) return "now";
    if (n === 1) return "1 min";
    return `${n} mins`;
}

export default function ChefTile() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Phase 6.5: notification toast state
    const [toast, setToast] = useState<any | null>(null);
    const toastShownDedupe = useRef<Set<string>>(new Set());

    async function refreshNext() {
        try {
            setErr(null);
            const res = await chefClient.next();
            setData(res);
        } catch (e: any) {
            setErr(e?.message || "Failed to load Chef");
        }
    }

    async function refreshToast() {
        try {
            const res = await chefClient.notifications(true, 10);
            if (!res.ok) return;

            // Find the newest unread go_time notification
            const go = (res.notifications || []).find((n: any) => n.type === "go_time" && !n.is_read);

            if (!go) {
                setToast(null);
                return;
            }

            // Avoid re-showing same toast if it was already shown this session
            const dedupe = String(go.dedupe_key || go.id);
            if (toastShownDedupe.current.has(dedupe)) return;

            toastShownDedupe.current.add(dedupe);
            setToast(go);
        } catch {
            // ignore
        }
    }

    async function refreshAll() {
        setLoading(true);
        await Promise.all([refreshNext(), refreshToast()]);
        setLoading(false);
    }

    useEffect(() => {
        refreshAll();
        const t = setInterval(() => {
            refreshNext();
            refreshToast();
        }, 15000); // keep the “alive” feeling
        return () => clearInterval(t);
    }, []);

    const mode = data?.ok ? data.mode : null;

    const goTime = useMemo(() => {
        return data?.ok && data.mode === "plan" ? Boolean(data.go_time) : false;
    }, [data]);

    const title =
        loading ? "Loading…" :
            mode === "none" ? "No meal scheduled" :
                mode === "active" ? "Cooking in progress" :
                    data?.plan?.title ?? "Cook plan";

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
            {/* Phase 6.5 Toast */}
            {toast ? (
                <div className="mb-3 rounded-2xl border border-white/15 bg-white/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold text-white/80">{toast.title ?? "Chef"}</div>
                            <div className="mt-1 text-sm text-white">{toast.body ?? "Start cooking now."}</div>
                            <div className="mt-1 text-xs text-white/50">
                                {toast.created_at ? new Date(toast.created_at).toLocaleString() : ""}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90"
                                onClick={async () => {
                                    // Prefer starting the currently returned plan
                                    const planId = data?.ok && data.mode === "plan" ? data.plan?.id : toast.cook_plan_id;
                                    if (!planId) return;

                                    const res: any = await chefClient.start(planId);

                                    // Mark notification read
                                    await chefClient.markNotificationsRead([toast.id]);
                                    setToast(null);

                                    // Update tile state -> active
                                    const exec = res?.execution ?? res?.active_execution ?? res;
                                    if (exec?.id) setData({ ok: true, mode: "active", active_execution: exec });
                                }}
                            >
                                Start
                            </button>

                            <button
                                className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                                onClick={async () => {
                                    await chefClient.markNotificationsRead([toast.id]);
                                    setToast(null);
                                }}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm text-white/60">Chef</div>
                    <div className="text-lg font-semibold text-white">{title}</div>
                </div>

                {goTime ? (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                        GO TIME
                    </span>
                ) : null}
            </div>

            {err ? <div className="mt-3 text-sm text-red-300">{err}</div> : null}

            {!loading && data?.ok && data.mode === "plan" ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-black/20 p-3">
                        <div className="text-xs text-white/60">Starts</div>
                        <div className="text-base font-semibold text-white">
                            {fmtMinutes(data.starts_in_minutes)}
                        </div>
                    </div>
                    <div className="rounded-xl bg-black/20 p-3">
                        <div className="text-xs text-white/60">Eat</div>
                        <div className="text-base font-semibold text-white">{fmtMinutes(data.eat_in_minutes)}</div>
                    </div>
                    <div className="rounded-xl bg-black/20 p-3">
                        <div className="text-xs text-white/60">Mode</div>
                        <div className="text-base font-semibold text-white">
                            {data.go_time ? "Execute" : "Standby"}
                        </div>
                    </div>
                </div>
            ) : null}

            {!loading && data?.ok && data.mode === "plan" ? (
                <div className="mt-4 flex items-center gap-2">
                    <button
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                        onClick={refreshAll}
                    >
                        Refresh
                    </button>

                    <button
                        className={`rounded-xl px-3 py-2 text-sm font-semibold ${data.go_time ? "bg-white text-black hover:bg-white/90" : "bg-white/10 text-white/60"
                            }`}
                        disabled={!data.go_time}
                        onClick={async () => {
                            const res: any = await chefClient.start(data.plan.id);
                            const exec = res?.execution ?? res?.active_execution ?? res;
                            if (exec?.id) setData({ ok: true, mode: "active", active_execution: exec });
                        }}
                    >
                        Start Cooking
                    </button>

                    <div className="ml-auto text-xs text-white/50">Updates every 15s</div>
                </div>
            ) : null}

            {!loading && data?.ok && data.mode === "active" ? (
                <div className="mt-4 text-sm text-white/70">
                    Execution ID:{" "}
                    <span className="font-mono text-white/80">{data.active_execution?.id}</span>
                    <div className="mt-2">
                        <a href="#chef-focus" className="text-white underline underline-offset-4">
                            Open Cooking Focus Mode
                        </a>
                    </div>
                </div>
            ) : null}

            {!loading && data?.ok && data.mode === "none" ? (
                <div className="mt-3 text-sm text-white/70">
                    Schedule a meal to unlock start-time guidance and hands-free cooking.
                </div>
            ) : null}
        </div>
    );
}

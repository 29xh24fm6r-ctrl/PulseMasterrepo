"use client";

import { useEffect, useMemo, useState } from "react";
import { chefClient } from "@/lib/chef/client";

function formatSeconds(sec: number) {
    if (sec < 60) return `${sec}s`;
    const m = Math.round(sec / 60);
    return `${m}m`;
}

export default function CookingFocusMode() {
    const [next, setNext] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    // Phase 6.5: suggestions state
    const [suggestions, setSuggestions] = useState<any | null>(null);
    const [suggestErr, setSuggestErr] = useState<string | null>(null);

    async function refresh() {
        try {
            setErr(null);
            const res = await chefClient.next();
            setNext(res);
        } catch (e: any) {
            setErr(e?.message || "Failed to load execution");
        }
    }

    async function refreshSuggestions(execution_id: string) {
        try {
            setSuggestErr(null);
            const res: any = await chefClient.suggestions(execution_id);
            if (res?.ok) setSuggestions(res);
            else setSuggestions(null);
        } catch (e: any) {
            setSuggestErr(e?.message || "Failed to load timer suggestions");
            setSuggestions(null);
        }
    }

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 3000); // tight loop while cooking
        return () => clearInterval(t);
    }, []);

    // When execution changes or step changes, refresh suggestions
    useEffect(() => {
        if (!next?.ok || next.mode !== "active") {
            setSuggestions(null);
            return;
        }
        const exec = next.active_execution;
        const executionId = exec?.id as string | undefined;
        if (!executionId) return;

        refreshSuggestions(executionId);
        // Also refresh when step changes (cheap, makes it feel smart)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [next?.ok, next?.mode, next?.active_execution?.id, next?.active_execution?.current_step]);

    if (err) {
        return (
            <div id="chef-focus" className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-red-300">{err}</div>
            </div>
        );
    }

    if (!next?.ok) return null;
    if (next.mode !== "active") return null;

    const exec = next.active_execution;
    const executionId = exec?.id as string;
    const currentStep = Number(exec?.current_step ?? 0);
    const timers = Array.isArray(exec?.timers) ? exec.timers : [];

    const stepText = useMemo(() => {
        return typeof suggestions?.step_text === "string" && suggestions.step_text.length
            ? suggestions.step_text
            : null;
    }, [suggestions]);

    const chips = useMemo(() => {
        const list = Array.isArray(suggestions?.suggestions) ? suggestions.suggestions : [];
        return list.slice(0, 6); // keep it clean
    }, [suggestions]);

    return (
        <div id="chef-focus" className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm text-white/60">Cooking Focus</div>
                    <div className="text-lg font-semibold text-white">Step {currentStep + 1}</div>
                    <div className="mt-1 text-xs text-white/50 font-mono">{executionId}</div>
                </div>

                <div className="flex gap-2">
                    <button
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                        onClick={() => chefClient.step(executionId, "prev")}
                    >
                        Prev
                    </button>
                    <button
                        className="rounded-xl bg-white text-black px-3 py-2 text-sm font-semibold hover:bg-white/90"
                        onClick={() => chefClient.step(executionId, "next")}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Step text (if available) */}
            {stepText ? (
                <div className="mt-3 rounded-2xl bg-black/20 p-3">
                    <div className="text-xs text-white/60">Current step</div>
                    <div className="mt-1 text-sm text-white">{stepText}</div>
                </div>
            ) : null}

            {/* Smart timer chips */}
            <div className="mt-4">
                <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">Smart timers</div>
                    {suggestErr ? <div className="text-xs text-red-300">{suggestErr}</div> : null}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                    {chips.length === 0 ? (
                        <div className="text-sm text-white/50">No suggestions yet.</div>
                    ) : (
                        chips.map((c: any) => (
                            <button
                                key={`${c.label}:${c.seconds}`}
                                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                                onClick={() => chefClient.timerStart(executionId, c.label, Number(c.seconds))}
                                title="Start timer"
                            >
                                {c.label} • {formatSeconds(Number(c.seconds))}
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-3 flex gap-2">
                    <button
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                        onClick={() => chefClient.timerStop(executionId)}
                    >
                        Stop Timer
                    </button>
                    <button
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                        onClick={() => chefClient.finish(executionId, exec.cook_plan_id, "completed")}
                    >
                        Finish
                    </button>
                </div>
            </div>

            {/* Timers list */}
            <div className="mt-4">
                <div className="text-xs text-white/60">Timers</div>
                <div className="mt-2 space-y-2">
                    {timers.length === 0 ? (
                        <div className="text-sm text-white/50">No active timers.</div>
                    ) : (
                        timers.slice(0, 5).map((t: any) => (
                            <div key={t.id} className="rounded-xl bg-black/20 p-3">
                                <div className="text-sm font-semibold text-white">{t.label}</div>
                                <div className="text-xs text-white/60">
                                    {t.seconds}s • started {t.started_at}
                                    {t.stopped_at ? ` • stopped ${t.stopped_at}` : ""}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

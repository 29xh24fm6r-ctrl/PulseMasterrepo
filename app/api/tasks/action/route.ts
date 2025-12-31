import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { jsonError, rateLimitOrThrow } from "@/lib/api/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function awardXp(userId: string, event_type: string, xp: number, ref_id: string) {
    await supabaseAdmin.rpc("award_xp", {
        p_user_id: userId,
        p_event_type: event_type,
        p_xp: xp,
        p_ref_table: "tasks",
        p_ref_id: ref_id,
        p_meta: { via: "tasks_action_api" },
    });
}

type Action =
    | { action: "complete"; task_id: string }
    | { action: "activate"; task_id: string }
    | { action: "block"; task_id: string; reason?: string }
    | { action: "snooze"; task_id: string; defer_until: string };

import { withJourney } from "@/lib/observability/journey";
import { withPerf } from "@/lib/observability/perf";
import { setObsContext } from "@/lib/observability/context";
import { supabaseSpan } from "@/lib/observability/supabaseSpan";

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    setObsContext({
        userId,
        area: "tasks",
        feature: "action",
        requestId: req.headers.get("x-request-id"),
    });

    return await withJourney({
        area: "tasks",
        feature: "action",
        name: "tasks.action",
        data: { method: "POST" },
        run: async () => {
            return await withPerf("tasks.action.total", async () => {
                try {
                    await rateLimitOrThrow(userId, "tasks.action");
                } catch (e: any) {
                    return jsonError(429, "rate_limited", "Too many task actions", { retry_in_ms: e?.retry_in_ms ?? 0 });
                }

                const body = (await req.json()) as Partial<Action>;
                const task_id = (body as any)?.task_id as string | undefined;
                const action = (body as any)?.action as Action["action"] | undefined;

                if (!task_id) return NextResponse.json({ error: "missing_task_id" }, { status: 400 });
                if (!action) return NextResponse.json({ error: "missing_action" }, { status: 400 });

                // Add action to context as tag
                setObsContext({
                    userId,
                    area: "tasks",
                    feature: `action:${action}`, // refine feature tag
                });

                let patch: Record<string, any> = {};

                switch (action) {
                    case "complete":
                        patch = { status: "completed" };
                        break;
                    case "activate":
                        patch = { status: "active", blocked_reason: null };
                        break;
                    case "block":
                        patch = { status: "blocked", blocked_reason: (body as any).reason ?? "Blocked" };
                        break;
                    case "snooze":
                        if (!(body as any).defer_until) {
                            return NextResponse.json({ error: "missing_defer_until" }, { status: 400 });
                        }
                        patch = { defer_until: (body as any).defer_until, status: "pending" };
                        break;
                    default:
                        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
                }

                // Canonical enforcement: only mutate tasks owned by authed user
                const { data, error } = await supabaseSpan("tasks.action.update", async () =>
                    await supabaseAdmin
                        .from("tasks")
                        .update(patch)
                        .eq("id", task_id)
                        .eq("user_id", userId)
                        .select("*")
                        .single()
                );

                if (error) {
                    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
                }
                if (!data) {
                    return NextResponse.json({ error: "not_found" }, { status: 404 });
                }

                if (action === "complete") {
                    await supabaseSpan("tasks.action.award_xp", async () => {
                        // Simple scoring: base + bonus for priority
                        const base = 10;
                        const pr = typeof (data as any).priority === "number" ? (data as any).priority : 0;
                        const bonus = Math.max(0, pr) * 2; // reward important work
                        await awardXp(userId, "task_complete", base + bonus, task_id);

                        // If this completion was the active focus task, emit a focus_complete event
                        const { data: prefs } = await supabaseAdmin
                            .from("user_prefs")
                            .select("active_focus_task_id,focus_mode_enabled")
                            .eq("user_id", userId)
                            .single();

                        if (prefs?.focus_mode_enabled && prefs?.active_focus_task_id === task_id) {
                            await awardXp(userId, "focus_complete", 25, task_id);

                            // clear focus lock (optional but feels great)
                            await supabaseAdmin
                                .from("user_prefs")
                                .upsert({ user_id: userId, focus_mode_enabled: false, active_focus_task_id: null }, { onConflict: "user_id" });
                        }
                    });
                }

                return NextResponse.json({ item: data });
            });
        },
    });
}

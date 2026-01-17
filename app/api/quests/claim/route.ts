import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { jsonError, rateLimitOrThrow } from "@/lib/api/guards";
import { logActivity } from "@/lib/activity/logActivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function utcDay(): string {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

import { withJourney } from "@/services/observability/journey";
import { withPerf } from "@/services/observability/perf";
import { setObsContext } from "@/services/observability/context";
import { supabaseSpan } from "@/services/observability/supabaseSpan";

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    try {
        await rateLimitOrThrow(userId, "quests.claim");
    } catch (e: any) {
        return jsonError(429, "rate_limited", "Too many claim attempts", { retry_in_ms: e?.retry_in_ms ?? 0 });
    }

    setObsContext({
        userId,
        area: "quests",
        feature: "claim",
        requestId: req.headers.get("x-request-id"),
    });

    return await withJourney({
        area: "quests",
        feature: "claim",
        name: "quests.claim",
        data: { method: "POST" },
        run: async () => {
            return await withPerf("quests.claim.total", async () => {
                const body = (await req.json()) as { quest_id: string };
                if (!body?.quest_id) return jsonError(400, "missing_quest_id");

                // ---- Canonical refresh: re-evaluate today's quests BEFORE claim ----
                const day = utcDay();
                const { error: evalErr } = await supabaseSpan("quests.claim.evaluate_rpc", async () =>
                    await getSupabaseAdminRuntimeClient().rpc("evaluate_daily_quests", {
                        p_user_id: userId,
                        p_quest_date: day,
                    })
                );

                if (evalErr) {
                    return jsonError(500, "quest_eval_failed", evalErr.message);
                }

                // Reload quest after evaluation (ownership enforced)
                const { data: quest, error } = await supabaseSpan("quests.claim.fetch", async () =>
                    await getSupabaseAdminRuntimeClient()
                        .from("daily_quests")
                        .select("*")
                        .eq("id", body.quest_id)
                        .eq("user_id", userId)
                        .single()
                );

                if (error || !quest) return jsonError(404, "not_found");

                if (!quest.is_completed) return jsonError(400, "not_completed");

                // Idempotency: prevent double claim
                if (quest.meta?.claimed) {
                    return NextResponse.json({ ok: true, already_claimed: true });
                }

                // Award XP indirectly via Activity Event (Canonical)
                const activityId = await supabaseSpan("quests.claim.log_activity", async () =>
                    await logActivity({
                        userId,
                        eventName: "quest.claimed",
                        source: "api",
                        entityType: "daily_quest",
                        entityId: quest.id,
                        metadata: {
                            quest_key: quest.quest_key,
                            quest_date: quest.quest_date,
                            xp_amount: quest.reward_xp // purely informational, trigger uses rules
                        }
                    })
                );

                if (!activityId) {
                    // Log warning handled inside logActivity mostly, but good to know
                    console.warn("Activity log failed for quest claim");
                }

                // Mark claimed
                const { error: markErr } = await supabaseSpan("quests.claim.mark_complete", async () =>
                    await getSupabaseAdminRuntimeClient()
                        .from("daily_quests")
                        .update({ meta: { ...(quest.meta ?? {}), claimed: true, claimed_at: new Date().toISOString() } })
                        .eq("id", quest.id)
                );

                if (markErr) return jsonError(500, "claim_mark_failed", markErr.message);

                return NextResponse.json({ ok: true });
            });
        },
    });
}


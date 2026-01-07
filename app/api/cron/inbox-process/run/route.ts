import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pickFirstMatchingRule, renderTemplate, computeDueAt } from "@/lib/inbox/autopilot";

async function handler(req: Request) {
    const url = new URL(req.url);
    const secret = req.headers.get("x-cron-secret") || url.searchParams.get("secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const limitPerUser = 50;

    // users with at least one enabled rule
    const rulesRes = await supabaseAdmin
        .from("inbox_rules")
        .select("user_id_uuid")
        .eq("enabled", true);

    if (rulesRes.error) {
        return NextResponse.json({ ok: false, error: rulesRes.error.message }, { status: 500 });
    }

    const users = Array.from(new Set((rulesRes.data ?? []).map((r: any) => r.user_id_uuid)));

    let totalProcessed = 0;
    let totalMatched = 0;
    let totalActions = 0;

    for (const userIdUuid of users) {
        // create run
        const runRes = await supabaseAdmin
            .from("inbox_rule_runs")
            .insert({ user_id_uuid: userIdUuid, meta: { source: "cron" } })
            .select("*")
            .single();

        if (runRes.error) continue;
        const run = runRes.data;

        try {
            const userRulesRes = await supabaseAdmin
                .from("inbox_rules")
                .select("*")
                .eq("user_id_uuid", userIdUuid)
                .eq("enabled", true)
                .order("priority", { ascending: true });

            if (userRulesRes.error) throw userRulesRes.error;
            const rules = userRulesRes.data ?? [];

            const itemsRes = await supabaseAdmin
                .from("inbox_items")
                .select("*")
                .eq("user_id_uuid", userIdUuid)
                .eq("is_archived", false)
                .eq("is_unread", true)
                .order("received_at", { ascending: false, nullsFirst: false })
                .limit(limitPerUser);

            if (itemsRes.error) throw itemsRes.error;
            const items = itemsRes.data ?? [];

            let matched = 0;
            let actions = 0;

            for (const item of items) {
                const rule = pickFirstMatchingRule(item, rules as any);
                if (!rule) {
                    await supabaseAdmin.from("inbox_rule_outcomes").insert({
                        user_id_uuid: userIdUuid,
                        run_id: run.id,
                        inbox_item_id: item.id,
                        matched: false,
                        note: "no_rule_matched",
                    });
                    continue;
                }

                matched += 1;

                // idempotency: skip if already converted
                const existing = await supabaseAdmin
                    .from("inbox_rule_outcomes")
                    .select("id")
                    .eq("user_id_uuid", userIdUuid)
                    .eq("inbox_item_id", item.id)
                    .eq("rule_id", rule.id)
                    .eq("matched", true)
                    .limit(1);

                if (!existing.error && (existing.data ?? []).length) {
                    await supabaseAdmin.from("inbox_rule_outcomes").upsert({
                        user_id_uuid: userIdUuid,
                        run_id: run.id,
                        inbox_item_id: item.id,
                        rule_id: rule.id,
                        matched: true,
                        action_type: rule.action_type,
                        note: "skipped_duplicate",
                    }, { onConflict: "user_id_uuid,inbox_item_id,rule_id" });
                    continue;
                }

                const title = renderTemplate(rule.action_title_template, item);
                const due_at = computeDueAt(item, rule.action_due_minutes);

                let target_table: string | null = null;
                let target_id: string | null = null;

                if (rule.action_type === "create_follow_up") {
                    const fu = await supabaseAdmin
                        .from("follow_ups")
                        .insert({
                            user_id: userIdUuid,
                            name: title,
                            person_name: null,
                            priority: "medium",
                            type: "general",
                            notes: item.snippet ?? "",
                            status: rule.action_status ?? "open",
                            due_date: due_at,
                            // source field not in type, meta not in type? 
                            // Casting to any to ensure we write the data we want, assuming schema supports it even if types don't
                            metadata: { inbox_item_id: item.id, rule_id: rule.id, source: "autopilot" },
                        } as any)
                        .select("id")
                        .single();
                    if (fu.error) throw fu.error;
                    target_table = "follow_ups";
                    target_id = fu.data.id;
                    actions += 1;
                }

                if (rule.action_type === "create_task") {
                    const t = await supabaseAdmin
                        .from("tasks")
                        .insert({
                            user_id: userIdUuid,
                            title,
                            status: rule.action_status ?? "open",
                            due_date: due_at,
                            description: item.snippet ?? "", // map snippet to description if possible
                            priority: "medium", // tasks needs priority?
                            metadata: { inbox_item_id: item.id, rule_id: rule.id },
                        } as any)
                        .select("id")
                        .single();
                    if (t.error) throw t.error;
                    target_table = "tasks";
                    target_id = t.data.id;
                    actions += 1;
                }

                // mark read/archive
                const inboxPatch: any = {};
                if (rule.action_mark_read) inboxPatch.is_unread = false;
                if (rule.action_archive || rule.action_type === "archive") inboxPatch.is_archived = true;

                if (Object.keys(inboxPatch).length) {
                    const upd = await supabaseAdmin
                        .from("inbox_items")
                        .update(inboxPatch)
                        .eq("id", item.id)
                        .eq("user_id_uuid", userIdUuid);
                    if (upd.error) throw upd.error;
                }

                await supabaseAdmin.from("inbox_actions").insert({
                    user_id_uuid: userIdUuid,
                    inbox_item_id: item.id,
                    action_type: rule.action_type,
                    target_table,
                    target_id,
                    payload: { rule_id: rule.id, title, due_at, cron: true },
                });

                await supabaseAdmin.from("inbox_rule_outcomes").insert({
                    user_id_uuid: userIdUuid,
                    run_id: run.id,
                    inbox_item_id: item.id,
                    rule_id: rule.id,
                    matched: true,
                    action_type: rule.action_type,
                    target_table,
                    target_id,
                });
            }

            await supabaseAdmin
                .from("inbox_rule_runs")
                .update({
                    finished_at: new Date().toISOString(),
                    status: "success",
                    processed_count: items.length,
                    matched_count: matched,
                    actions_count: actions,
                })
                .eq("id", run.id)
                .eq("user_id_uuid", userIdUuid);

            totalProcessed += items.length;
            totalMatched += matched;
            totalActions += actions;
        } catch (e: any) {
            await supabaseAdmin
                .from("inbox_rule_runs")
                .update({
                    finished_at: new Date().toISOString(),
                    status: "failed",
                    error: String(e?.message ?? e),
                })
                .eq("id", run.id)
                .eq("user_id_uuid", userIdUuid);
        }
    }

    return NextResponse.json({
        ok: true,
        users: users.length,
        totalProcessed,
        totalMatched,
        totalActions,
    });
}

export async function POST(req: Request) {
    return handler(req);
}

export async function GET(req: Request) {
    return handler(req);
}

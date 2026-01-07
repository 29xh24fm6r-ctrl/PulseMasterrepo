import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { pickFirstMatchingRule, renderTemplate, computeDueAt } from "@/lib/inbox/autopilot";

async function alreadyConverted(userIdUuid: string, inboxItemId: string, ruleId: string, actionType: string) {
    const o = await supabaseAdmin
        .from("inbox_rule_outcomes")
        .select("id")
        .eq("user_id_uuid", userIdUuid)
        .eq("inbox_item_id", inboxItemId)
        .eq("rule_id", ruleId)
        .eq("matched", true)
        .limit(1);

    if (!o.error && (o.data ?? []).length) return true;

    const a = await supabaseAdmin
        .from("inbox_actions")
        .select("id")
        .eq("user_id_uuid", userIdUuid)
        .eq("inbox_item_id", inboxItemId)
        .eq("action_type", actionType)
        .limit(1);

    if (!a.error && (a.data ?? []).length) return true;

    return false;
}

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 200);

    // create run
    const runRes = await supabaseAdmin
        .from("inbox_rule_runs")
        .insert({ user_id_uuid: gate.canon.userIdUuid, meta: { source: "manual" } } as any)
        .select("*")
        .single();

    if (runRes.error) return NextResponse.json({ ok: false, error: runRes.error.message }, { status: 500 });
    const run = runRes.data;

    try {
        const rulesRes = await supabaseAdmin
            .from("inbox_rules")
            .select("*")
            .eq("user_id_uuid", gate.canon.userIdUuid)
            .eq("enabled", true)
            .order("priority", { ascending: true });

        if (rulesRes.error) throw rulesRes.error;

        const itemsRes = await supabaseAdmin
            .from("inbox_items")
            .select("*")
            .eq("user_id_uuid", gate.canon.userIdUuid)
            .eq("is_archived", false)
            .eq("is_unread", true)
            .order("received_at", { ascending: false, nullsFirst: false })
            .limit(limit);

        if (itemsRes.error) throw itemsRes.error;

        const rules = rulesRes.data ?? [];
        const items = itemsRes.data ?? [];

        let matched = 0;
        let actions = 0;

        for (const item of items) {
            const rule = pickFirstMatchingRule(item, rules as any);
            if (!rule) {
                await supabaseAdmin.from("inbox_rule_outcomes").insert({
                    user_id_uuid: gate.canon.userIdUuid,
                    run_id: run.id,
                    inbox_item_id: item.id,
                    matched: false,
                    note: "no_rule_matched",
                });
                continue;
            }

            matched += 1;

            const skip = await alreadyConverted(gate.canon.userIdUuid, item.id, rule.id, rule.action_type);
            if (skip) {
                await supabaseAdmin.from("inbox_rule_outcomes").upsert({
                    user_id_uuid: gate.canon.userIdUuid,
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
                        user_id: gate.canon.userIdUuid,
                        name: title,
                        person_name: null,
                        notes: item.snippet ?? "",
                        status: rule.action_status ?? "open",
                        due_date: due_at,
                        type: "general",
                        priority: "medium",
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
                        user_id: gate.canon.userIdUuid,
                        title,
                        status: rule.action_status ?? "open",
                        due_date: due_at,
                        description: item.snippet ?? "",
                        priority: "medium",
                        metadata: { inbox_item_id: item.id, rule_id: rule.id },
                    } as any)
                    .select("id")
                    .single();
                if (t.error) throw t.error;
                target_table = "tasks";
                target_id = t.data.id;
                actions += 1;
            }

            // mark read/archive based on rule flags
            const inboxPatch: any = {};
            if (rule.action_mark_read) inboxPatch.is_unread = false;
            if (rule.action_archive || rule.action_type === "archive") inboxPatch.is_archived = true;

            if (Object.keys(inboxPatch).length) {
                const upd = await supabaseAdmin
                    .from("inbox_items")
                    .update(inboxPatch)
                    .eq("id", item.id)
                    .eq("user_id_uuid", gate.canon.userIdUuid);
                if (upd.error) throw upd.error;
            }

            await supabaseAdmin.from("inbox_actions").insert({
                user_id_uuid: gate.canon.userIdUuid,
                inbox_item_id: item.id,
                action_type: rule.action_type,
                target_table,
                target_id,
                payload: { rule_id: rule.id, title, due_at },
            });

            await supabaseAdmin.from("inbox_rule_outcomes").insert({
                user_id_uuid: gate.canon.userIdUuid,
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
            .eq("user_id_uuid", gate.canon.userIdUuid);

        return NextResponse.json({ ok: true, runId: run.id, processed: items.length, matched, actions });
    } catch (e: any) {
        await supabaseAdmin
            .from("inbox_rule_runs")
            .update({
                finished_at: new Date().toISOString(),
                status: "failed",
                error: String(e?.message ?? e),
            })
            .eq("id", run.id)
            .eq("user_id_uuid", gate.canon.userIdUuid);

        return NextResponse.json({ ok: false, error: String(e?.message ?? e), runId: run.id }, { status: 500 });
    }
}

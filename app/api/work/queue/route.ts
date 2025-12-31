import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";

function startOfTodayISO(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}
function endOfTodayISO(): string {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
}

export async function GET(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const todayStart = startOfTodayISO();
    const todayEnd = endOfTodayISO();

    // Inbox needing action
    // Note: we can't do .in("triage_status", ["needs_reply", "to_do", "waiting", "new"]) if we want to be strict about 'new' appearing too.
    // Actually the prompt asked for "needing action" which implied everything except 'done' or 'ignored'.
    // We'll stick to the requested list: "needs_reply", "to_do", "waiting", "new".
    const inbox = await supabaseAdmin
        .from("inbox_items")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .eq("is_archived", false)
        .in("triage_status", ["needs_reply", "to_do", "waiting", "new"])
        .order("triage_priority", { ascending: false })
        .order("received_at", { ascending: false, nullsFirst: false })
        .limit(50);

    // Follow-ups due today (and open/snoozed)
    const followups = await supabaseAdmin
        .from("follow_ups")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .in("status", ["open", "snoozed"])
        .gte("due_at", todayStart)
        .lte("due_at", todayEnd)
        .order("due_at", { ascending: true })
        .limit(50);

    // Tasks due today (and not done/archived)
    const tasks = await supabaseAdmin
        .from("tasks")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .not("status", "in", '("done","archived")')
        .gte("due_at", todayStart)
        .lte("due_at", todayEnd)
        .order("due_at", { ascending: true })
        .limit(50);

    // Autopilot last run
    const autopilot = await supabaseAdmin
        .from("inbox_rule_runs")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .order("started_at", { ascending: false })
        .limit(1);

    if (inbox.error) return NextResponse.json({ ok: false, error: inbox.error.message }, { status: 500 });
    if (followups.error) return NextResponse.json({ ok: false, error: followups.error.message }, { status: 500 });
    if (tasks.error) return NextResponse.json({ ok: false, error: tasks.error.message }, { status: 500 });
    if (autopilot.error) return NextResponse.json({ ok: false, error: autopilot.error.message }, { status: 500 });

    return NextResponse.json({
        ok: true,
        inbox: inbox.data ?? [],
        followUpsDueToday: followups.data ?? [],
        tasksDueToday: tasks.data ?? [],
        lastAutopilotRun: (autopilot.data ?? [])[0] ?? null,
        todayStart,
        todayEnd,
    });
}

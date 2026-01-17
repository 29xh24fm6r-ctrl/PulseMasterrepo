import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

function todayDate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const day = todayDate();

    // Pull the work queue quickly
    const inbox = await getSupabaseAdminRuntimeClient()
        .from("inbox_items")
        .select("id, subject, triage_status, triage_priority")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .eq("is_archived", false)
        .in("triage_status", ["needs_reply", "to_do", "waiting", "new"])
        .order("triage_priority", { ascending: false })
        .limit(20);

    const tasks = await getSupabaseAdminRuntimeClient()
        .from("tasks")
        .select("id, title, due_at, status")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .not("status", "in", '("done","archived")')
        .order("due_at", { ascending: true })
        .limit(20);

    const fus = await getSupabaseAdminRuntimeClient()
        .from("follow_ups")
        .select("id, title, due_at, status")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .in("status", ["open", "snoozed"])
        .order("due_at", { ascending: true })
        .limit(20);

    if (inbox.error) return NextResponse.json({ ok: false, error: inbox.error.message }, { status: 500 });

    const content =
        `Today’s Brief (${day})\n\n` +
        `Inbox needing action: ${(inbox.data ?? []).length}\n` +
        `Tasks open: ${(tasks.data ?? []).length}\n` +
        `Follow-ups open: ${(fus.data ?? []).length}\n\n` +
        `Top Inbox:\n` +
        (inbox.data ?? []).slice(0, 8).map((x: any) => `- [${x.triage_priority}] (${x.triage_status}) ${x.subject ?? "(no subject)"}`).join("\n") +
        `\n\nTop Tasks:\n` +
        (tasks.data ?? []).slice(0, 8).map((x: any) => `- ${x.title}`).join("\n") +
        `\n\nTop Follow-ups:\n` +
        (fus.data ?? []).slice(0, 8).map((x: any) => `- ${x.title}`).join("\n");

    const up = await getSupabaseAdminRuntimeClient()
        .from("daily_briefs")
        .upsert(
            { user_id_uuid: gate.canon.userIdUuid, day, title: "Daily Brief", content, meta: { source: "v1" } },
            { onConflict: "user_id_uuid,day" }
        )
        .select("*")
        .single();

    if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, brief: up.data });
}

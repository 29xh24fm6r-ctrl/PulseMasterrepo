import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TodayHandlingItem = {
    id: string;
    title: string;
    description?: string | null;
    href?: string | null;
    kind: "email" | "activity" | "task" | "system";
    ts?: string | null;
};

type TodayAttentionItem = {
    id: string;
    title: string;
    description?: string | null;
    href?: string | null;
    kind: "email" | "task" | "system";
    severity: "low" | "med" | "high";
    ts?: string | null;
};

export async function GET() {
    const nowIso = new Date().toISOString();

    try {
        // 1) Pending email approvals count
        const { count: pendingEmailCount, error: pendingErr } = await supabaseAdmin
            .from("email_outbox")
            .select("id", { count: "exact", head: true })
            .eq("approval_status", "pending");

        if (pendingErr) {
            return NextResponse.json(
                { ok: false, error: "TODAY_EMAIL_PENDING_FAILED", detail: pendingErr.message },
                { status: 500 }
            );
        }

        // 2) Deferred emails due now (deferred items whose defer_until is in the past)
        // NOTE: This is about "come back to it now".
        const { count: deferredDueCount, error: deferredErr } = await supabaseAdmin
            .from("email_outbox")
            .select("id", { count: "exact", head: true })
            .eq("approval_status", "deferred")
            .lte("defer_until", nowIso);

        if (deferredErr) {
            return NextResponse.json(
                { ok: false, error: "TODAY_EMAIL_DEFERRED_FAILED", detail: deferredErr.message },
                { status: 500 }
            );
        }

        // 3) Recent activity events (last 10)
        const { data: activity, error: activityErr } = await supabaseAdmin
            .from("activity_events")
            .select("id,created_at,source,event_type,title,detail,payload")
            .order("created_at", { ascending: false })
            .limit(10);

        if (activityErr) {
            return NextResponse.json(
                { ok: false, error: "TODAY_ACTIVITY_FAILED", detail: activityErr.message },
                { status: 500 }
            );
        }

        // Build "Needs Attention"
        const attention: TodayAttentionItem[] = [];

        const pendingCount = pendingEmailCount ?? 0;
        if (pendingCount > 0) {
            attention.push({
                id: "email-approvals",
                title: `Approve ${pendingCount} email${pendingCount === 1 ? "" : "s"}`,
                description: "Pulse is holding drafted/queued emails for your approval. Nothing sends without you.",
                href: "/email/queue",
                kind: "email",
                severity: pendingCount >= 5 ? "high" : pendingCount >= 2 ? "med" : "low",
                ts: nowIso,
            });
        }

        const dueCount = deferredDueCount ?? 0;
        if (dueCount > 0) {
            attention.push({
                id: "email-deferred-due",
                title: `${dueCount} deferred email${dueCount === 1 ? "" : "s"} ready to revisit`,
                description: "Deferred items have reached their defer time. Review and approve when ready.",
                href: "/email/queue",
                kind: "email",
                severity: dueCount >= 5 ? "high" : dueCount >= 2 ? "med" : "low",
                ts: nowIso,
            });
        }

        if (attention.length === 0) {
            attention.push({
                id: "nothing-needs-you",
                title: "Nothing needs you right now",
                description: "Pulse will interrupt only when necessary.",
                href: null,
                kind: "system",
                severity: "low",
                ts: nowIso,
            });
        }

        // Build "What Pulse Is Handling"
        // We use activity events as a truthful view of what Pulse actually did.
        const handling: TodayHandlingItem[] =
            (activity ?? []).slice(0, 5).map((e: any) => ({
                id: e.id,
                title: e.title,
                description: e.detail ?? null,
                href:
                    e.event_type?.startsWith("email.")
                        ? "/email/queue"
                        : null,
                kind: e.event_type?.startsWith("email.") ? "email" : "activity",
                ts: e.created_at,
            })) ?? [];

        // If no activity exists, give a truthful empty-state handling item
        if (handling.length === 0) {
            handling.push({
                id: "handling-empty",
                title: "Pulse isn’t handling anything yet",
                description: "Use Quick Capture below to give Pulse something to take off your mind.",
                href: null,
                kind: "system",
                ts: nowIso,
            });
        }

        return NextResponse.json({
            ok: true,
            now: nowIso,
            stats: {
                pending_email_approvals: pendingCount,
                deferred_email_due: dueCount,
            },
            handling,
            needs_attention: attention, // Map to UI expectation if needed, or update UI to use "attention"
            activity: activity ?? [],
        });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: "TODAY_FAILED", detail: err?.message ?? String(err) },
            { status: 500 }
        );
    }
}

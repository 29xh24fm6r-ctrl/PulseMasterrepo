import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("inbox_rules")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .order("priority", { ascending: true });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rules: data ?? [] });
}

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const payload = {
        user_id_uuid: gate.canon.userIdUuid,
        enabled: body.enabled ?? true,
        priority: body.priority ?? 100,

        match_from_email: body.match_from_email ?? null,
        match_subject_contains: body.match_subject_contains ?? null,
        match_body_contains: body.match_body_contains ?? null,
        match_snippet_contains: body.match_snippet_contains ?? null,

        action_type: body.action_type ?? "create_follow_up",
        action_title_template: body.action_title_template ?? "{{subject}}",
        action_due_minutes: body.action_due_minutes ?? null,
        action_status: body.action_status ?? null,
        action_archive: body.action_archive ?? false,
        action_mark_read: body.action_mark_read ?? true,

        meta: body.meta ?? {},
    };

    const { data, error } = await getSupabaseAdminRuntimeClient().from("inbox_rules").insert(payload).select("*").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rule: data });
}

export async function PATCH(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const patch: any = {};
    for (const k of [
        "enabled", "priority",
        "match_from_email", "match_subject_contains", "match_body_contains", "match_snippet_contains",
        "action_type", "action_title_template", "action_due_minutes", "action_status", "action_archive", "action_mark_read",
        "meta",
    ]) {
        if (body[k] !== undefined) patch[k] = body[k];
    }

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("inbox_rules")
        .update(patch)
        .eq("id", body.id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rule: data });
}

export async function DELETE(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const { error } = await getSupabaseAdminRuntimeClient()
        .from("inbox_rules")
        .delete()
        .eq("id", id)
        .eq("user_id_uuid", gate.canon.userIdUuid);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

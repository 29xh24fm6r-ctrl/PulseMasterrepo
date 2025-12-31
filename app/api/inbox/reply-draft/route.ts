import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const url = new URL(req.url);
    const inboxItemId = url.searchParams.get("inboxItemId");
    if (!inboxItemId) return NextResponse.json({ ok: false, error: "Missing inboxItemId" }, { status: 400 });

    const { data, error } = await supabaseAdmin
        .from("reply_drafts")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .eq("inbox_item_id", inboxItemId)
        .single();

    if (error) return NextResponse.json({ ok: true, draft: null }); // not found is OK
    return NextResponse.json({ ok: true, draft: data });
}

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    const inboxItemId = body?.inboxItemId as string | undefined;
    if (!inboxItemId) return NextResponse.json({ ok: false, error: "Missing inboxItemId" }, { status: 400 });

    // pull inbox item to seed subject/body
    const itemRes = await supabaseAdmin
        .from("inbox_items")
        .select("subject, from_email, from_name, snippet")
        .eq("id", inboxItemId)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .single();

    if (itemRes.error) return NextResponse.json({ ok: false, error: itemRes.error.message }, { status: 404 });

    const subj = itemRes.data.subject ?? "(no subject)";
    const draftBody =
        body?.body ??
        `Hi ${itemRes.data.from_name ?? ""},\n\n` +
        `Thanks for reaching out about "${subj}".\n\n` +
        `— Matt`;

    const ins = await supabaseAdmin
        .from("reply_drafts")
        .upsert(
            {
                user_id_uuid: gate.canon.userIdUuid,
                inbox_item_id: inboxItemId,
                subject: `Re: ${subj}`,
                body: draftBody,
                status: "draft",
                meta: { seeded: true },
            },
            { onConflict: "user_id_uuid,inbox_item_id" }
        )
        .select("*")
        .single();

    if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, draft: ins.data });
}

export async function PATCH(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const patch: any = {};
    for (const k of ["subject", "body", "status", "meta"]) {
        if (body[k] !== undefined) patch[k] = body[k];
    }

    const upd = await supabaseAdmin
        .from("reply_drafts")
        .update(patch)
        .eq("id", id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, draft: upd.data });
}

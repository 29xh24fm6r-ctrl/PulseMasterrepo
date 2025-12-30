import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const inboxItemId = body?.inboxItemId as string | undefined;
    if (!inboxItemId) return NextResponse.json({ ok: false, error: "Missing inboxItemId" }, { status: 400 });

    const itemRes = await supabaseAdmin
        .from("inbox_items")
        .select("subject, from_name, from_email, snippet, body")
        .eq("id", inboxItemId)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .single();

    if (itemRes.error) return NextResponse.json({ ok: false, error: itemRes.error.message }, { status: 404 });

    // V1: deterministic “assistant” fallback (AI plug later)
    const subj = itemRes.data.subject ?? "(no subject)";
    const name = itemRes.data.from_name ?? itemRes.data.from_email ?? "there";

    const draft = {
        subject: `Re: ${subj}`,
        body:
            `Hi ${name},\n\n` +
            `Thanks for your message about "${subj}".\n\n` +
            `Here’s what I can do next:\n` +
            `- \n\n` +
            `Does this work for you?\n\n` +
            `— Matt`,
        meta: { source: "deterministic_v1" },
    };

    return NextResponse.json({ ok: true, draft });
}

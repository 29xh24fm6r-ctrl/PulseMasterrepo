import "server-only";
import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const url = new URL(req.url);

    const dealId = url.searchParams.get("deal_id");
    const contactId = url.searchParams.get("contact_id");
    const uploadId = url.searchParams.get("upload_id");

    if (!dealId && !contactId && !uploadId) {
      return NextResponse.json(
        { ok: false, error: "Must provide deal_id, contact_id, or upload_id" },
        { status: 400 }
      );
    }

    // Build query to find latest job for the entity
    let query = supabaseAdmin
      .from("job_queue")
      .select("id, job_type, status, created_at")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (dealId) {
      // Jobs related to deals might have deal_id in payload
      query = query.contains("payload", { deal_id: dealId });
    } else if (contactId) {
      query = query.contains("payload", { contact_id: contactId });
    } else if (uploadId) {
      query = query.contains("payload", { upload_id: uploadId });
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      job_id: data?.id ?? null,
      job_type: data?.job_type ?? null,
      status: data?.status ?? null,
      created_at: data?.created_at ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}


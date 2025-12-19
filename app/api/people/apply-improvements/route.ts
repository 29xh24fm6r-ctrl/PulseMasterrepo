// app/api/people/apply-improvements/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function ok(data: any = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

function fail(error: string, extra: Record<string, any> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status: 200 });
}

const Schema = z.object({
  contact_id: z.string().uuid(),
  patch: z.record(z.any()),
});

export async function POST(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = await req.json().catch(() => null);
    if (!body) return fail("Invalid JSON");

    const parsed = Schema.safeParse(body);
    if (!parsed.success) return fail("Validation failed", { issues: parsed.error.issues });

    const { contact_id, patch } = parsed.data;

    // Ownership guard: ensure the contact belongs to this user
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, owner_user_id")
      .eq("id", contact_id)
      .single();

    if (readErr || !existing) return fail("Contact not found");
    if (existing.owner_user_id !== clerkUserId) return fail("Forbidden");

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("crm_contacts")
      .update(patch)
      .eq("id", contact_id)
      .select("*")
      .single();

    if (updErr) return fail("Update failed", { supabase: updErr });

    return ok({ person: updated });
  } catch (e: any) {
    console.error("[apply-improvements] fatal", e);
    return fail("Internal error");
  }
}


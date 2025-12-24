// app/api/deals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/pulse/isUuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const sp = supabaseAdmin;

    // If dev override uses a non-UUID (e.g., "dev_matt"), return empty for smoke testing
    if (!isUuid(userId)) {
      return NextResponse.json({ ok: true, deals: [] });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "50");
    const stage = searchParams.get("stage"); // optional filter

    let q = sp
      .from("deals")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (stage) {
      q = q.eq("stage", stage);
    }

    const { data, error } = await q;
    if (error) throw error;

    const deals = (data ?? []).map((d: any) => ({
      id: d.id,
      name: d.name ?? d.title ?? "Untitled Deal",
      company: d.company ?? null,
      contactName: d.contact_name ?? d.person_name ?? null,
      contactEmail: d.contact_email ?? null,
      contactPhone: d.contact_phone ?? null,
      stage: d.stage ?? d.status ?? "lead",
      value: d.value ?? d.amount ?? 0,
      loanType: d.loan_type ?? null,
      notes: d.notes ?? null,
      lastContact: d.last_contact ?? d.last_activity ?? null,
      nextAction: d.next_action ?? null,
      nextActionDate: d.next_action_date ?? null,
      probability: d.probability ?? 50,
      createdAt: d.created_at ?? null,
      updatedAt: d.updated_at ?? null,
    }));

    return NextResponse.json({ ok: true, deals });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

// POST - Create new deal (keep for compatibility)
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const sp = supabaseAdmin;
    const body = (await req.json().catch(() => ({}))) as any;

    if (!isUuid(userId)) {
      return NextResponse.json({ ok: false, error: "Invalid user ID" }, { status: 401 });
    }

    const { name, company, amount, stage, close_date, notes } = body || {};

    if (!name || !String(name).trim()) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }

    const amt = amount === null || amount === undefined || amount === "" ? null : Number(amount);

    const { data: deal, error } = await sp
      .from("deals")
      .insert({
        user_id: userId,
        name: String(name).trim(),
        company: company ? String(company).trim() : null,
        amount: Number.isFinite(amt) ? amt : null,
        stage: stage || "prospect",
        close_date: close_date || null,
        notes: notes ? String(notes).trim() : null,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, deal });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

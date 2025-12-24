// app/api/follow-ups/route.ts
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
      return NextResponse.json({ ok: true, followUps: [] });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // e.g., pending/scheduled/done
    const limit = Number(searchParams.get("limit") || "50");

    let q = sp.from("follow_ups").select("*").eq("user_id", userId).limit(limit);
    if (status) q = q.eq("status", status);

    const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;

    const followUps = (data ?? []).map((f: any) => ({
      id: f.id,
      personName: f.person_name ?? f.contact_name ?? f.name ?? "Unknown",
      company: f.company ?? null,
      email: f.email ?? null,
      phone: f.phone ?? null,
      type: f.type ?? "email",
      status: f.status ?? "pending",
      priority: f.priority ?? "medium",
      dueDate: f.due_date ?? null,
      subject: f.subject ?? null,
      notes: f.notes ?? null,
      lastAction: f.last_action ?? null,
      lastActionDate: f.last_action_date ?? null,
      dealId: f.deal_id ?? null,
      createdAt: f.created_at ?? null,
      updatedAt: f.updated_at ?? null,
    }));

    return NextResponse.json({ ok: true, followUps });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

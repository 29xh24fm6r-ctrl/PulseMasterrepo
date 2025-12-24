// app/api/habits/route.ts
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

    // Dev override smoke-test: non-UUID means "no real DB user yet"
    if (!isUuid(userId)) {
      return NextResponse.json({ ok: true, habits: [] });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    let q = sp
      .from("habits")
      .select("id,name,xp,is_active,created_at,updated_at")
      .eq("user_id", userId);

    if (activeOnly) {
      q = q.eq("is_active", true);
    }

    const { data, error } = await q.order("created_at", { ascending: false });

    if (error) throw error;

    const habits = (data ?? []).map((h: any) => ({
      id: h.id,
      name: h.name,
      xp: h.xp ?? 10,
      isActive: h.is_active ?? true,
      createdAt: h.created_at ?? null,
      updatedAt: h.updated_at ?? null,
    }));

    return NextResponse.json({ ok: true, habits });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

// POST - Create new habit
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const sp = supabaseAdmin;
    const body = (await req.json().catch(() => ({}))) as any;

    if (!isUuid(userId)) {
      return NextResponse.json({ ok: false, error: "Invalid user ID" }, { status: 401 });
    }

    const { name, frequency, target, notes, is_active } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }

    const { data: habit, error } = await sp
      .from("habits")
      .insert({
        user_id: userId,
        name: String(name).trim(),
        frequency: frequency || "daily",
        target: target || 1,
        notes: notes?.trim() || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, habit });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

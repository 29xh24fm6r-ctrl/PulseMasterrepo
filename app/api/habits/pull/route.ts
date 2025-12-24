// app/api/habits/pull/route.ts
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/pulse/isUuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const sp = supabaseAdmin;

    if (!isUuid(userId)) {
      return NextResponse.json({ ok: true, habits: [] });
    }

    const { data, error } = await sp
      .from("habits")
      .select("id,name,xp,is_active,created_at,updated_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

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
    const msg = e?.message ?? "Failed to pull habits";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

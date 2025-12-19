// app/api/habits/route.ts
// Supabase-only habits endpoint (migrated from Notion)
// Sprint 3B: Uses canonical resolveSupabaseUser()
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET - List all habits for user
export async function GET(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    let query = supabaseAdmin
      .from("habits")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data: habits, error } = await query;

    if (error) throw error;

    return NextResponse.json({ items: habits ?? [] });
  } catch (err: any) {
    console.error("Habits GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create new habit
export async function POST(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await req.json();

    // Ignore user_id if provided (server sets it)
    if (body.user_id) {
      delete body.user_id;
    }

    const { name, frequency, target, notes, is_active } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data: habit, error } = await supabaseAdmin
      .from("habits")
      .insert({
        user_id: supabaseUserId,
        name: name.trim(),
        frequency: frequency || "daily",
        target: target || 1,
        notes: notes?.trim() || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: habit }, { status: 200 });
  } catch (err: any) {
    console.error("Habits POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create habit" }, { status: 500 });
  }
}

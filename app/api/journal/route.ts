// app/api/journal/route.ts
// Supabase-only journal endpoint (migrated from Notion)
// Sprint 3B: Uses canonical resolveSupabaseUser()
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET - List journal entries for user
export async function GET(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let query = supabaseAdmin
      .from("journal_entries")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("entry_date", startDate);
    }
    if (endDate) {
      query = query.lte("entry_date", endDate);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    return NextResponse.json({ items: entries ?? [] });
  } catch (err: any) {
    console.error("Journal GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create new journal entry
export async function POST(req: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await req.json();

    // Ignore user_id if provided (server sets it)
    if (body.user_id) {
      delete body.user_id;
    }

    const { entry_date, title, content, mood, tags } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data: entry, error } = await supabaseAdmin
      .from("journal_entries")
      .insert({
        user_id: supabaseUserId,
        entry_date: entry_date || new Date().toISOString().split("T")[0],
        title: title?.trim() || null,
        content: content.trim(),
        mood: mood || null,
        tags: Array.isArray(tags) ? tags : null,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: entry }, { status: 200 });
  } catch (err: any) {
    console.error("Journal POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create journal entry" }, { status: 500 });
  }
}


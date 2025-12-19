// app/api/journal/[id]/route.ts
// Update or delete a journal entry
// Sprint 3B: Uses canonical resolveSupabaseUser()
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// PATCH - Update journal entry
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const entryId = resolvedParams.id;

    const body = await req.json();
    const { entry_date, title, content, mood, tags } = body;

    // Ignore user_id if provided (server sets it)
    if (body.user_id) {
      delete body.user_id;
    }

    // Verify ownership
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("journal_entries")
      .select("id")
      .eq("id", entryId)
      .eq("user_id", supabaseUserId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    // Build update payload
    const updatePayload: any = {};
    if (entry_date !== undefined) updatePayload.entry_date = entry_date;
    if (title !== undefined) updatePayload.title = title?.trim() || null;
    if (content !== undefined) updatePayload.content = content?.trim() || null;
    if (mood !== undefined) updatePayload.mood = mood || null;
    if (tags !== undefined) updatePayload.tags = Array.isArray(tags) ? tags : null;

    const { data: entry, error } = await supabaseAdmin
      .from("journal_entries")
      .update(updatePayload)
      .eq("id", entryId)
      .eq("user_id", supabaseUserId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: entry });
  } catch (err: any) {
    console.error("Journal PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update journal entry" }, { status: 500 });
  }
}

// DELETE - Delete journal entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const entryId = resolvedParams.id;

    // Verify ownership
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("journal_entries")
      .select("id")
      .eq("id", entryId)
      .eq("user_id", supabaseUserId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("journal_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", supabaseUserId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Journal DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete journal entry" }, { status: 500 });
  }
}

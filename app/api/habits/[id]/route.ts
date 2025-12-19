// app/api/habits/[id]/route.ts
// Update or delete a habit
// Sprint 3B: Uses canonical resolveSupabaseUser()
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// PATCH - Update habit
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const habitId = resolvedParams.id;

    const body = await req.json();
    const { name, frequency, target, notes, is_active } = body;

    // Ignore user_id if provided (server sets it)
    if (body.user_id) {
      delete body.user_id;
    }

    // Verify ownership
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("habits")
      .select("id")
      .eq("id", habitId)
      .eq("user_id", supabaseUserId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    // Build update payload
    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name?.trim() || null;
    if (frequency !== undefined) updatePayload.frequency = frequency;
    if (target !== undefined) updatePayload.target = target;
    if (notes !== undefined) updatePayload.notes = notes?.trim() || null;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data: habit, error } = await supabaseAdmin
      .from("habits")
      .update(updatePayload)
      .eq("id", habitId)
      .eq("user_id", supabaseUserId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: habit });
  } catch (err: any) {
    console.error("Habits PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update habit" }, { status: 500 });
  }
}

// DELETE - Delete habit
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const habitId = resolvedParams.id;

    // Verify ownership
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("habits")
      .select("id")
      .eq("id", habitId)
      .eq("user_id", supabaseUserId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("habits")
      .delete()
      .eq("id", habitId)
      .eq("user_id", supabaseUserId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Habits DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete habit" }, { status: 500 });
  }
}

// app/api/habits/[id]/log/route.ts
// Log habit completion
// Sprint 3B: Uses canonical resolveSupabaseUser()
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST - Log habit completion
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const habitId = resolvedParams.id;

    const body = await req.json();
    const { occurred_on, count } = body;

    // Verify habit ownership
    const { data: habit, error: habitError } = await supabaseAdmin
      .from("habits")
      .select("id")
      .eq("id", habitId)
      .eq("user_id", supabaseUserId)
      .single();

    if (habitError || !habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    // Use provided date or today
    const logDate = occurred_on || new Date().toISOString().split("T")[0];
    const logCount = count || 1;

    // Upsert log entry (unique constraint prevents duplicates)
    const { data: log, error } = await supabaseAdmin
      .from("habit_logs")
      .upsert(
        {
          user_id: supabaseUserId,
          habit_id: habitId,
          occurred_on: logDate,
          count: logCount,
        },
        {
          onConflict: "user_id,habit_id,occurred_on",
        }
      )
      .select("*")
      .single();

    if (error) {
      // If it's a unique constraint violation, try to update instead
      if (error.code === "23505") {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("habit_logs")
          .update({ count: logCount })
          .eq("user_id", supabaseUserId)
          .eq("habit_id", habitId)
          .eq("occurred_on", logDate)
          .select("*")
          .single();

        if (updateError) throw updateError;
        return NextResponse.json({ item: updated });
      }
      throw error;
    }

    return NextResponse.json({ item: log }, { status: 200 });
  } catch (err: any) {
    console.error("Habit log POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to log habit" }, { status: 500 });
  }
}

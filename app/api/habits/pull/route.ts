// app/api/habits/pull/route.ts
// Legacy endpoint - kept for backward compatibility with existing widgets
// Maps to canonical /api/habits schema
import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePulseUserUuidFromClerk } from "@/lib/auth/resolvePulseUserUuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clerkUserId = await requireClerkUserId();
    const pulseUserUuid = await resolvePulseUserUuidFromClerk(clerkUserId);

    const { data: habits, error } = await supabaseAdmin
      .from("habits")
      .select("*")
      .eq("user_id", pulseUserUuid)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Map to legacy format for backward compatibility
    return NextResponse.json({
      ok: true,
      habits: (habits || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        icon: "✓", // Default icon
        streak: 0, // TODO: Calculate from habit_logs
        lastCompleted: null, // TODO: Fetch from habit_logs
        frequency: h.frequency,
        completedToday: false, // TODO: Check habit_logs for today
      })),
    });
  } catch (err: any) {
    console.error("Habits pull error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to pull habits",
      },
      { status: 500 }
    );
  }
}

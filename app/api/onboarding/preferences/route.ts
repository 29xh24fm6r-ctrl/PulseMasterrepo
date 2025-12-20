// Save Dashboard Preferences
// app/api/onboarding/preferences/route.ts

import { supabaseServer } from "@/lib/supabase/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const supabase = supabaseServer();

    const body = await request.json();

    const { error } = await supabase
      .from("user_dashboard_preferences")
      .upsert({
        user_id: clerkUserId,
      show_tasks_focus: body.show_tasks_focus ?? true,
      show_money_snapshot: body.show_money_snapshot ?? true,
      show_relationships: body.show_relationships ?? true,
      show_strategy_xp: body.show_strategy_xp ?? true,
      show_energy_mood: body.show_energy_mood ?? true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to save preferences:", error);
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status: 401 });
  }
}





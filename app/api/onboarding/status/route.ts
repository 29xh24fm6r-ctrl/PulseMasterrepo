// GET /api/onboarding/status
// Check if user has completed onboarding

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";



export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminRuntimeClient();
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("onboarding_completed, archetype, summary, profile_data")
      .eq("user_id", userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ completed: false });
    }

    return NextResponse.json({
      completed: profile.onboarding_completed === true,
      archetype: profile.archetype,
      summary: profile.summary,
    });
  } catch (error) {
    console.error("[Onboarding Status]", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}

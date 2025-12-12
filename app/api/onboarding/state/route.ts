// Get Onboarding State
// app/api/onboarding/state/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_onboarding_state")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = not found, which is fine for new users
    console.error("Failed to fetch onboarding state:", error);
    return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
  }

  return NextResponse.json({
    hasCompletedCore: data?.has_completed_core ?? false,
    hasSeenLifeTour: data?.has_seen_life_tour ?? false,
    hasSeenWorkTour: data?.has_seen_work_tour ?? false,
    hasSeenFinanceTour: data?.has_seen_finance_tour ?? false,
    hasSeenRelationshipsTour: data?.has_seen_relationships_tour ?? false,
  });
}





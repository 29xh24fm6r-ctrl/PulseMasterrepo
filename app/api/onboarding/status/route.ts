// GET /api/onboarding/status
// Check if user has completed onboarding

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

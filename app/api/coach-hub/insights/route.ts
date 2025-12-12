// Coach Hub Insights API
// app/api/coach-hub/insights/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const { data: insights } = await supabaseAdmin
      .from("coach_shared_insights")
      .select("*")
      .eq("user_id", dbUserId)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      insights: insights || [],
    });
  } catch (err: any) {
    console.error("[CoachHubInsights] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get insights" },
      { status: 500 }
    );
  }
}


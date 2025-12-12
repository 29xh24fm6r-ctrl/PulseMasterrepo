// Simulation History API
// app/api/simulation/history/route.ts

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

    const { data: runs } = await supabaseAdmin
      .from("simulation_runs")
      .select("*")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ runs: runs || [] });
  } catch (err: any) {
    console.error("[SimulationHistory] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get simulation history" },
      { status: 500 }
    );
  }
}





// AGI Runs API - Fetch recent AGI runs
// app/api/agi/runs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  const { userId } = await auth();
  return userId || null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    const { data, error } = await supabaseAdmin
      .from("agi_runs")
      .select("*")
      .eq("user_id", dbUserId)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to fetch AGI runs", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("AGI runs fetch error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch runs" }, { status: 500 });
  }
}




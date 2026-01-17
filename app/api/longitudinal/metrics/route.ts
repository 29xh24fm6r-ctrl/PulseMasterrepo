import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "30d";

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("lb_daily_metrics")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch metrics:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }

  return NextResponse.json({ metrics: data || [] });
}
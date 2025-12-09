import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const [valuesRes, strengthsRes, momentumRes] = await Promise.all([
      supabase.from("id_values").select("value_name, importance_rank, confidence")
        .eq("user_id", userId).eq("active", true).order("importance_rank", { ascending: true }).limit(10),
      supabase.from("id_strengths").select("strength_name, category, confidence")
        .eq("user_id", userId).order("confidence", { ascending: false }).limit(10),
      supabase.from("id_momentum_daily").select("date, alignment_score, net_momentum")
        .eq("user_id", userId).gte("date", thirtyDaysAgo).order("date", { ascending: true }),
    ]);

    return NextResponse.json({
      values: valuesRes.data || [],
      strengths: strengthsRes.data || [],
      momentum: momentumRes.data || [],
    });
  } catch (error) {
    console.error("Failed to fetch identity profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
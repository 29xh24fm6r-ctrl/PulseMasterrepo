import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { generateProactiveInterventions, storeIntervention, dismissIntervention } from "@/lib/proactive/engine";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

// GET - Get pending interventions for user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "true";

  const supabase = getSupabase();

  // If refresh requested, generate new interventions
  if (refresh) {
    const newInterventions = await generateProactiveInterventions(userId);
    for (const intervention of newInterventions) {
      await storeIntervention(userId, intervention);
    }
  }

  // Get pending interventions
  const { data, error } = await supabase
    .from("proactive_interventions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Failed to fetch interventions:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  return NextResponse.json({ interventions: data || [] });
}

// POST - Dismiss or act on intervention
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { intervention_id, action } = await req.json();

  if (!intervention_id || !["dismissed", "completed", "snoozed"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const success = await dismissIntervention(userId, intervention_id, action);

  if (!success) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
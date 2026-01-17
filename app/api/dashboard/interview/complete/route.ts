// POST /api/dashboard/interview/complete
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { deriveProfileFromAnswers } from "@/lib/dashboard/profileDerivation";
import { generateInitialLayout } from "@/lib/dashboard/layoutEngine";



export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminRuntimeClient();
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get completed session
    const { data: session } = await supabase
      .from("user_interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_complete", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!session) return NextResponse.json({ error: "No completed session" }, { status: 400 });

    // Derive profile
    const derived = deriveProfileFromAnswers(session.answers || []);

    // Upsert profile
    await supabase.from("user_profiles").upsert({
      user_id: userId,
      work_style: derived.work_style,
      cognitive_profile: derived.cognitive_profile,
      professional_identity: derived.professional_identity,
      motivation_profile: derived.motivation_profile,
      difficulty_setting: derived.difficulty_setting,
      interview_completed: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Generate layout
    const layout = generateInitialLayout(derived);

    // Deactivate old layouts
    await supabase
      .from("user_dashboard_layouts")
      .update({ active: false })
      .eq("user_id", userId)
      .eq("active", true);

    // Create new layout
    await supabase.from("user_dashboard_layouts").insert({
      user_id: userId,
      version: 1,
      active: true,
      layout_json: layout,
    });

    return NextResponse.json({
      success: true,
      profile: { work_style: derived.work_style, difficulty_setting: derived.difficulty_setting },
      layout,
    });
  } catch (error) {
    console.error("[Interview Complete]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

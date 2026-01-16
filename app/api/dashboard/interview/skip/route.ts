// POST /api/dashboard/interview/skip
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { createDefaultProfile } from "@/lib/dashboard/profileDerivation";
import { createDefaultLayout } from "@/lib/dashboard/layoutEngine";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const defaults = createDefaultProfile();

    await supabase.from("user_profiles").upsert({
      user_id: userId,
      work_style: defaults.work_style,
      cognitive_profile: defaults.cognitive_profile,
      professional_identity: defaults.professional_identity,
      motivation_profile: defaults.motivation_profile,
      difficulty_setting: defaults.difficulty_setting,
      interview_completed: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    await supabase
      .from("user_dashboard_layouts")
      .update({ active: false })
      .eq("user_id", userId)
      .eq("active", true);

    const layout = createDefaultLayout();
    await supabase.from("user_dashboard_layouts").insert({
      user_id: userId,
      version: 1,
      active: true,
      layout_json: layout,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Interview Skip]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getWidgetsForProfile, LAYOUT_PRESETS } from "@/lib/dashboard/widgets";

// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single();

    if (!profile) {
      return NextResponse.json({
        widgets: LAYOUT_PRESETS['balanced'],
        style: { density: 'comfortable', visualStyle: 'dark_focused' },
        gamification: { xp: true, streaks: true },
        profile: null,
        isDefault: true
      });
    }

    const profileData = profile.profile_data || {};

    // Log for debugging
    console.log("[Dashboard Config] Industry:", profileData?.role?.industry);
    console.log("[Dashboard Config] Profile Data:", JSON.stringify(profileData));

    const widgets = getWidgetsForProfile(profileData);

    console.log("[Dashboard Config] Generated widgets:", widgets);

    return NextResponse.json({
      widgets,
      style: {
        density: profileData?.preferences?.dashboardDensity < 0.35 ? 'sparse' : profileData?.preferences?.dashboardDensity > 0.65 ? 'dense' : 'comfortable',
        visualStyle: profileData?.preferences?.visualStyle || 'dark_focused'
      },
      gamification: profileData?.preferences?.gamification || { xp: true, streaks: true },
      profile: { archetype: profile.archetype, summary: profile.summary, ...profileData },
      isDefault: false,
    });
  } catch (error) {
    console.error("[Dashboard Config]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/onboarding/skip
// Skip onboarding and create default profile

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const defaultProfile = {
      archetype: "Explorer",
      summary: "You're just getting started with Pulse. We'll learn more about you as we go.",
      lifeContext: {
        season: "exploring",
        domains: ["career"],
        primaryFocus: "productivity",
        constraints: [],
      },
      role: {
        type: "unknown",
      },
      family: {
        situation: "unknown",
      },
      psychology: {
        currentState: "stable",
        selfAccountability: "moderate",
      },
      energy: {
        level: "good",
        bestTime: "morning",
      },
      goals: {},
      preferences: {
        dashboardDensity: 0.5,
        visualStyle: "dark_focused",
        primaryView: "daily_focus",
        gamification: {
          overall: "like",
          xp: true,
          streaks: true,
          celebrations: "moderate",
          leaderboards: false,
        },
        coach: {
          personality: "supportive_friend",
          tone: "warm",
          pushLevel: 0.5,
          focusAreas: ["productivity", "focus"],
        },
        notifications: {
          frequency: "moderate",
          bestTimes: ["morning", "afternoon"],
          avoidTimes: ["evening"],
        },
      },
      dashboardConfig: {
        widgets: [
          "daily_focus",
          "guidance_stream",
          "tasks_today",
          "calendar_preview",
          "xp_progress",
          "streak_tracker",
          "quick_capture",
        ],
        style: "dark_focused",
        density: "comfortable",
      },
      coachingFocus: ["productivity", "focus", "time_management"],
      scoreboardMetrics: ["tasks_completed", "focus_time", "streak_days"],
    };

    // Create profile
    await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        archetype: defaultProfile.archetype,
        summary: defaultProfile.summary,
        profile_data: defaultProfile,
        life_season: defaultProfile.lifeContext.season,
        dashboard_density: defaultProfile.preferences.dashboardDensity,
        coach_style: defaultProfile.preferences.coach.personality,
        gamification_level: defaultProfile.preferences.gamification.overall,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    // Create default dashboard layout
    await supabase.from("user_dashboard_layouts").upsert(
      {
        user_id: userId,
        layout_data: {
          widgets: defaultProfile.dashboardConfig.widgets,
          style: defaultProfile.dashboardConfig.style,
          density: defaultProfile.dashboardConfig.density,
          gamification: defaultProfile.preferences.gamification,
          coach: defaultProfile.preferences.coach,
        },
        is_active: true,
        version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Onboarding Skip]", error);
    return NextResponse.json({ error: "Failed to skip" }, { status: 500 });
  }
}

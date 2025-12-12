// AGI Profile API
// GET /api/agi/profile - Get user's AGI profile
// POST /api/agi/profile - Update user's AGI profile

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAGIUserProfile, saveAGIUserProfile } from "@/lib/agi/settings";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getAGIUserProfile(userId);

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("[AGI Profile API] GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      priorities,
      capabilities,
      autonomyStyle,
      rituals,
      focusAreas,
      tone,
      notificationPreferences,
      predictiveAssistance,
      hardLimits,
    } = body;

    const updated = await saveAGIUserProfile(userId, {
      priorities,
      capabilities,
      autonomyStyle,
      rituals,
      focusAreas,
      tone,
      notificationPreferences,
      predictiveAssistance,
      hardLimits,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[AGI Profile API] POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save profile" }, { status: 500 });
  }
}




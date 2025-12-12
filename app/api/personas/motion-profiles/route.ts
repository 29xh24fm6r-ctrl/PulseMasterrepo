// Motion Profiles API
// app/api/personas/motion-profiles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { seedMotionProfiles, PREDEFINED_MOTION_PROFILES } from "@/lib/personas/motion";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure profiles are seeded
    await seedMotionProfiles();

    return NextResponse.json({ profiles: PREDEFINED_MOTION_PROFILES });
  } catch (err: any) {
    console.error("[MotionProfiles] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get motion profiles" },
      { status: 500 }
    );
  }
}





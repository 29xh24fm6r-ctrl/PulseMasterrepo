// Sovereign Intelligence Profile API
// app/api/sovereign-intelligence/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBehaviorProfile, updateBehaviorProfile } from "@/lib/cortex/sovereign/sovereign-intelligence/profile-store";
import { runSovereignUpdate } from "@/lib/cortex/sovereign/sovereign-intelligence/sim-engine";
import { buildPulseCortexContext } from "@/lib/cortex/context";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getBehaviorProfile(userId);

    return NextResponse.json(profile);
  } catch (err: unknown) {
    console.error("[Sovereign Intelligence] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to get behavior profile";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "update") {
      const ctx = await buildPulseCortexContext(userId);
      const updatedProfile = await runSovereignUpdate(userId, ctx);
      return NextResponse.json(updatedProfile);
    } else if (action === "reset") {
      const { field, value } = body;
      await updateBehaviorProfile(userId, { [field]: value });
      const profile = await getBehaviorProfile(userId);
      return NextResponse.json(profile);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[Sovereign Intelligence] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to update behavior profile";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




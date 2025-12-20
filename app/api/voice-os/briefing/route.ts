// Voice OS Briefing API
// app/api/voice-os/briefing/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { generateVoiceBriefing, briefingToNarrative } from "@/lib/voice-os/session-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clerkUserId = await requireClerkUserId();
    const briefingData = await generateVoiceBriefing(clerkUserId);
    const narrative = briefingToNarrative(briefingData, "warm_advisor");
    return NextResponse.json({ ok: true, narrative, briefing: briefingData });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to generate voice briefing" },
      { status: 500 }
    );
  }
}


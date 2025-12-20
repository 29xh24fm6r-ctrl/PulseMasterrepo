// Voice OS Session API
// app/api/voice-os/session/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { createVoiceSession } from "@/lib/voice-os/session-manager";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const clerkUserId = await requireClerkUserId();
    const session = await createVoiceSession(clerkUserId);
    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create voice session" },
      { status: 500 }
    );
  }
}


// Identity Resonance Preview API
// app/api/identity/resonance/preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { computeIdentityResonance } from "@/lib/identity/resonance";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tags, emotion, coachId, risk_type } = body;

    const resonance = await computeIdentityResonance(userId, {
      coachId,
      tags: tags || [],
      emotion: emotion || null,
      risk_type: risk_type || null,
    });

    return NextResponse.json({
      resonance: resonance || null,
    });
  } catch (err: any) {
    console.error("[IdentityResonancePreview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to compute resonance" },
      { status: 500 }
    );
  }
}


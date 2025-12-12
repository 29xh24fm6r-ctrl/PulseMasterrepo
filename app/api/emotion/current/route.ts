// Stub endpoint for /api/emotion/current
// app/api/emotion/current/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    state: "neutral",
    stress: 0.5,
    energy: 0.6,
    detected_emotion: "neutral",
    intensity: 0.5,
  });
}




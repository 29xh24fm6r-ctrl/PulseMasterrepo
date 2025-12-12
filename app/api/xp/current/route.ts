// Stub endpoint for /api/xp/current
// app/api/xp/current/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    level: 1,
    xpThisWeek: 0,
    xpToNextLevel: 100,
    total: 0,
  });
}




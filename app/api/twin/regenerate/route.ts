// AI Twin Regenerate API - POST /api/twin/regenerate
// app/api/twin/regenerate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildOrUpdateTwinModel } from "@/lib/twin/engine";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const twin = await buildOrUpdateTwinModel(userId);

    return NextResponse.json({ twin });
  } catch (error: any) {
    console.error("Failed to regenerate twin:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




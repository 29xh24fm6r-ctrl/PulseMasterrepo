// World Influence API - GET /api/world/influence
// app/api/world/influence/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { computeWorldInfluenceForUser } from "@/lib/world/engine";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const influence = await computeWorldInfluenceForUser(userId);

    return NextResponse.json({ influence });
  } catch (error: any) {
    console.error("Failed to compute world influence:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




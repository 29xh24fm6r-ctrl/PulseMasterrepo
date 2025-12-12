// AI Twin API - GET /api/twin
// app/api/twin/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTwinModel } from "@/lib/twin/engine";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const twin = await getTwinModel(userId);

    return NextResponse.json({ twin });
  } catch (error: any) {
    console.error("Failed to fetch twin:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




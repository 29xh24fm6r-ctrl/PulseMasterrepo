// CRM Relationship Radar API
// app/api/crm/radar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRelationshipRadar } from "@/lib/crm/radar";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;

    const radar = await getRelationshipRadar(userId, limit);
    return NextResponse.json({ radar });
  } catch (err: any) {
    console.error("Failed to fetch relationship radar:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}





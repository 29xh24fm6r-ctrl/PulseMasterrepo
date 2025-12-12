// Meta-OS Profile API - GET /api/metaos/profile
// app/api/metaos/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMetaProfile } from "@/lib/metaos/engine";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getMetaProfile(userId);

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("Failed to fetch meta profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




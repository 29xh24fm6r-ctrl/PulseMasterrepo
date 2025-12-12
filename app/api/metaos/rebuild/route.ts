// Meta-OS Rebuild API - POST /api/metaos/rebuild
// app/api/metaos/rebuild/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rebuildUserOS } from "@/lib/metaos/engine";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rebuild = await rebuildUserOS(userId);

    return NextResponse.json({ rebuild });
  } catch (error: any) {
    console.error("Failed to rebuild OS:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




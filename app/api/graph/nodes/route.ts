// Graph Nodes API
// app/api/graph/nodes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getNodesByType } from "@/lib/graph/api";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || undefined;
    const search = searchParams.get("search") || undefined;

    const nodes = await getNodesByType(userId, type, search);
    return NextResponse.json({ nodes });
  } catch (err: any) {
    console.error("Failed to fetch graph nodes:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}





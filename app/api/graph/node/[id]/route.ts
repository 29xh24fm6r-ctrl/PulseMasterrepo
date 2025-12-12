// Graph Node Details API
// app/api/graph/node/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getNodeDetails } from "@/lib/graph/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const node = await getNodeDetails(userId, params.id);
    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json({ node });
  } catch (err: any) {
    console.error("Failed to fetch node details:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}





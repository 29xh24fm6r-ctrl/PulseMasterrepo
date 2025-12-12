// Graph Neighborhood API
// app/api/graph/neighborhood/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getNeighborhood } from "@/lib/graph/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const neighborhood = await getNeighborhood(userId, params.id);
    if (!neighborhood) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json({ neighborhood });
  } catch (err: any) {
    console.error("Failed to fetch neighborhood:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}





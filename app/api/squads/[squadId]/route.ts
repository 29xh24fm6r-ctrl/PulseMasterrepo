// Squad Detail API - GET /api/squads/[squadId]
// app/api/squads/[squadId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildSquadWorldState } from "@/lib/experience/squad-world";

export async function GET(
  request: NextRequest,
  { params }: { params: { squadId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { squadId } = params;

    // Build squad world state
    const state = await buildSquadWorldState(userId, squadId);

    return NextResponse.json({ state });
  } catch (error: any) {
    console.error("Failed to fetch squad:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




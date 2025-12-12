// app/api/mythic/state/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { getMythicState } from "@/lib/mythic/engine";

export async function GET() {
  try {
    const userId = await requireClerkUserId();
    const state = await getMythicState(userId);
    return NextResponse.json(state);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to get mythic state" }, { status: 500 });
  }
}


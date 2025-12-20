// Get current user ID
// app/api/user/me/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireClerkUserId();
    return NextResponse.json({ ok: true, userId });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unauthorized" },
      { status: 401 }
    );
  }
}


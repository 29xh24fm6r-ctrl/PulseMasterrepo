// Cortex Context API
// app/api/cortex/context/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clerkUserId = await requireClerkUserId();
    const context = await getWorkCortexContextForUser(clerkUserId);
    return NextResponse.json({ ok: true, context });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load cortex context" },
      { status: 500 }
    );
  }
}

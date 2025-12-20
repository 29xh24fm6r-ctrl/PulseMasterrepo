// AR Context API
// app/api/ar/context/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { buildARContext } from "@/lib/ar/context-builder";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clerkUserId = await requireClerkUserId();
    const context = await buildARContext(clerkUserId);
    return NextResponse.json({ ok: true, context });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load AR context" },
      { status: 500 }
    );
  }
}


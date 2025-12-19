import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createNeedsResponseTasks } from "@/lib/email/needsResponse";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/needs-response/tasks
 * Creates one task per needs-response thread (no duplicates)
 */
export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = body?.limit ? parseInt(body.limit, 10) : undefined;

    const result = await createNeedsResponseTasks({ clerkUserId, limit });

    return NextResponse.json({
      ok: true,
      created: result.created,
      skipped: result.skipped,
    });
  } catch (err) {
    console.error("[needs-response/tasks] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to create tasks" },
      { status: 500 }
    );
  }
}


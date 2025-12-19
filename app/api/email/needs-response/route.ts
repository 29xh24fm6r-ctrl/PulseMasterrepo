import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getNeedsResponseThreads } from "@/lib/email/needsResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/email/needs-response
 * Returns all email threads where needs_response = true
 */
export async function GET(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 25;

  try {
    const items = await getNeedsResponseThreads({ clerkUserId, limit });

    return NextResponse.json({
      ok: true,
      items: items || [],
    });
  } catch (err) {
    console.error("[needs-response] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to fetch threads" },
      { status: 500 }
    );
  }
}


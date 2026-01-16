/**
 * Email Sync API
 * POST /api/email/sync - Trigger email sync
 * GET /api/email/sync - Get sync status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  syncEmailThreads,
  getThreadsNeedingFollowup,
  getUnreadImportant,
} from "@/services/email/sync";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { maxResults = 100, daysBack = 7 } = body;

    const result = await syncEmailThreads(userId, { maxResults, daysBack });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[Email Sync] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [needsFollowup, unreadImportant] = await Promise.all([
      getThreadsNeedingFollowup(userId),
      getUnreadImportant(userId),
    ]);

    return NextResponse.json({
      needsFollowup,
      unreadImportant,
      counts: {
        needsFollowup: needsFollowup.length,
        unreadImportant: unreadImportant.length,
      },
    });
  } catch (error: any) {
    console.error("[Email Sync GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

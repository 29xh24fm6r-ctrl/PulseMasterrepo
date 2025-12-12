// Focus Session API
// app/api/productivity/focus-session/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { startFocusSession, endFocusSession, getActiveSession } from "@/lib/productivity/focus";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, mode, workItemIds, sessionId, completedItemIds } = body;

    if (action === "start") {
      if (!mode || !workItemIds) {
        return NextResponse.json(
          { error: "mode and workItemIds required" },
          { status: 400 }
        );
      }

      const session = await startFocusSession(userId, mode, workItemIds);
      return NextResponse.json({ session });
    }

    if (action === "end") {
      if (!sessionId || !completedItemIds) {
        return NextResponse.json(
          { error: "sessionId and completedItemIds required" },
          { status: 400 }
        );
      }

      await endFocusSession(sessionId, completedItemIds);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'start' or 'end'" },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[FocusSession] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to manage session";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getActiveSession(userId);
    return NextResponse.json({ session });
  } catch (err: unknown) {
    console.error("[FocusSession] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to get session";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




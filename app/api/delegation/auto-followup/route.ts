/**
 * Auto-Followup API
 * POST /api/delegation/auto-followup - Generate followup for a call
 * POST /api/delegation/auto-followup/batch - Process recent calls
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  generateAutoFollowupDraftForCall,
  processRecentCallsForFollowups,
} from "@/lib/delegation/auto-followup";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, batch, hoursBack } = body;

    // Batch mode: process recent calls
    if (batch) {
      const result = await processRecentCallsForFollowups(
        userId,
        hoursBack || 24
      );
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Single event mode
    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const result = await generateAutoFollowupDraftForCall({
      userId,
      eventId,
    });

    return NextResponse.json({
      success: !result.skipped,
      ...result,
    });
  } catch (error: any) {
    console.error("[Auto-Followup API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
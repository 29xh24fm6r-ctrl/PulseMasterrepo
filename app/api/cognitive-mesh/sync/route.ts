// API Route: POST /api/cognitive-mesh/sync
// Sync all existing data into the Cognitive Mesh

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DataAdapters } from "@/lib/cognitive-mesh/data-adapters";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sources = ["all"] } = body;

    const results: Record<string, number> = {};

    if (sources.includes("all") || sources.includes("tasks")) {
      results.tasks = await DataAdapters.ingestAllTasks(userId);
    }

    if (sources.includes("all") || sources.includes("contacts")) {
      results.contacts = await DataAdapters.ingestAllContacts(userId);
    }

    if (sources.includes("all") || sources.includes("calendar")) {
      results.calendar = await DataAdapters.ingestRecentCalendarEvents(userId, 60);
    }

    if (sources.includes("all") || sources.includes("deals")) {
      results.deals = await DataAdapters.ingestAllDeals(userId);
    }

    const total = Object.values(results).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      message: `Synced ${total} events into Cognitive Mesh`,
      results,
      total,
    });
  } catch (error: any) {
    console.error("[Cognitive Mesh Sync] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const maxDuration = 60;
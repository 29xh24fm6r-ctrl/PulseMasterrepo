// API Route: POST /api/cognitive-mesh/ingest
// Ingest raw events into the Third Brain

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CognitiveMesh } from "@/lib/cognitive-mesh";
import { ExtractionEngine } from "@/lib/cognitive-mesh/extraction-engine";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { source, source_id, payload, process_immediately = true } = body;

    if (!source || !payload) {
      return NextResponse.json(
        { error: "source and payload are required" },
        { status: 400 }
      );
    }

    // Ingest raw event
    const event = await CognitiveMesh.ingestRawEvent(userId, {
      source,
      source_id,
      payload,
      occurred_at: payload.occurred_at || new Date().toISOString(),
    });

    // Process immediately if requested
    let extraction = null;
    if (process_immediately) {
      try {
        extraction = await ExtractionEngine.processRawEvent(
          userId,
          event.id,
          source,
          payload
        );
      } catch (error) {
        console.error("Extraction failed:", error);
        // Don't fail the request, event is still stored
      }
    }

    return NextResponse.json({
      success: true,
      event_id: event.id,
      processed: !!extraction,
      extraction: extraction || null,
    });
  } catch (error: any) {
    console.error("[Cognitive Mesh Ingest] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// Intelligence API - Run intelligence gathering
// app/api/intel/run/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { runIntelForEntity } from "@/lib/intelligence";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const body = await request.json();

    const { entity_type, entity_id, queries } = body;

    if (!entity_type || !entity_id) {
      return jsonOk(
        { error: "entity_type and entity_id are required" },
        { status: 400 }
      );
    }

    if (entity_type !== "person" && entity_type !== "organization") {
      return jsonOk(
        { error: "entity_type must be 'person' or 'organization'" },
        { status: 400 }
      );
    }

    const result = await runIntelForEntity(
      userId,
      entity_type,
      entity_id,
      queries
    );

    return jsonOk({
      success: true,
      findings_count: result.findings.length,
      memory_fragments_created: result.memory_fragments_created,
      summary: result.summary,
      message: `Intelligence gathered and stored in Second Brain. ${result.memory_fragments_created} memory fragments created.`,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}


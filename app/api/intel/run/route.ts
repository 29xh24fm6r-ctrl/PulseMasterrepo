// Intelligence API - Run intelligence gathering
// app/api/intel/run/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { runIntelForEntity } from "@/lib/intelligence";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = await request.json();

    const { entity_type, entity_id, queries } = body;

    if (!entity_type || !entity_id) {
      return Response.json(
        { ok: false, error: "entity_type and entity_id are required" },
        { status: 400 }
      );
    }

    if (entity_type !== "person" && entity_type !== "organization") {
      return Response.json(
        { ok: false, error: "entity_type must be 'person' or 'organization'" },
        { status: 400 }
      );
    }

    // ✅ Map Clerk -> DB UUID
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    if (userErr || !userRow?.id) {
      return Response.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    const dbUserId = userRow.id;

    // ✅ Use DB UUID for intel engine
    const result = await runIntelForEntity(
      dbUserId,
      entity_type,
      entity_id,
      queries
    );

    return jsonOk({
      success: true,
      findings_count: result.findings?.length || 0,
      memory_fragments_created: result.memory_fragments_created || 0,
      summary: result.summary || "",
      message: `Intelligence gathered and stored in Second Brain. ${result.memory_fragments_created || 0} memory fragments created.`,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}


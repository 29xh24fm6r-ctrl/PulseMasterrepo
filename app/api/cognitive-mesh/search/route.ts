// API Route: POST /api/cognitive-mesh/search
// Semantic search across the Third Brain

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CognitiveMesh } from "@/lib/cognitive-mesh";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      query,
      limit = 10,
      min_importance,
      fragment_types,
      include_entities = true,
      include_context = false,
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    // Semantic search for fragments
    const fragments = await CognitiveMesh.semanticSearch(userId, {
      query,
      limit,
      minImportance: min_importance,
      fragmentTypes: fragment_types,
    });

    // Optionally search entities too
    let entities: any[] = [];
    if (include_entities) {
      entities = await CognitiveMesh.searchEntities(userId, {
        query,
        limit: Math.ceil(limit / 2),
      });
    }

    // Optionally build full context
    let context = null;
    if (include_context) {
      const entityIds = entities.slice(0, 3).map(e => e.id);
      context = await CognitiveMesh.buildContext(userId, {
        query,
        entityIds,
        includeRecentFragments: true,
      });
    }

    return NextResponse.json({
      fragments,
      entities,
      context: context?.summary || null,
      total_fragments: fragments.length,
      total_entities: entities.length,
    });
  } catch (error: any) {
    console.error("[Cognitive Mesh Search] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
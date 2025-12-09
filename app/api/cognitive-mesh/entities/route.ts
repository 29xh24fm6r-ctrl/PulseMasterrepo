// API Route: /api/cognitive-mesh/entities
// Manage entities in the knowledge graph

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CognitiveMesh } from "@/lib/cognitive-mesh";

// GET /api/cognitive-mesh/entities
// List and search entities
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const entityTypes = searchParams.get("types")?.split(",") as any;
    const minImportance = searchParams.get("min_importance");
    const limit = searchParams.get("limit");

    const entities = await CognitiveMesh.searchEntities(userId, {
      query: query || undefined,
      entityTypes,
      minImportance: minImportance ? parseFloat(minImportance) : undefined,
      limit: limit ? parseInt(limit) : 50,
    });

    return NextResponse.json({ entities, count: entities.length });
  } catch (error: any) {
    console.error("[Entities GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/cognitive-mesh/entities
// Create a new entity
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entity_type, name, canonical_key, description, aliases, metadata, importance } = body;

    if (!entity_type || !name) {
      return NextResponse.json(
        { error: "entity_type and name are required" },
        { status: 400 }
      );
    }

    const entity = await CognitiveMesh.findOrCreateEntity(userId, {
      entity_type,
      name,
      canonical_key,
      description,
      aliases,
      metadata,
      importance,
    });

    return NextResponse.json({ entity });
  } catch (error: any) {
    console.error("[Entities POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// API Route: /api/cognitive-mesh/entities/[id]
// Get entity details including graph connections

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CognitiveMesh } from "@/lib/cognitive-mesh";

// GET /api/cognitive-mesh/entities/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeGraph = searchParams.get("graph") !== "false";
    const includeFragments = searchParams.get("fragments") !== "false";
    const graphDepth = parseInt(searchParams.get("depth") || "1");

    // Get entity
    const entity = await CognitiveMesh.getEntity(userId, id);
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Get graph connections
    let graph = null;
    if (includeGraph) {
      graph = await CognitiveMesh.traverseGraph(userId, {
        startEntityId: id,
        maxDepth: graphDepth,
      });
    }

    // Get related fragments
    let fragments = null;
    if (includeFragments) {
      fragments = await CognitiveMesh.getEntityFragments(userId, id, 20);
    }

    // Get direct edges
    const edges = await CognitiveMesh.getEntityEdges(userId, id);

    return NextResponse.json({
      entity,
      edges,
      graph: graph
        ? {
            entities: graph.entities.filter((e) => e.id !== id),
            edges: graph.edges,
          }
        : null,
      fragments,
    });
  } catch (error: any) {
    console.error("[Entity Detail] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
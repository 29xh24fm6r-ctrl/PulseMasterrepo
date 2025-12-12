// Job Graph API
// app/api/jobs/graph/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { seedJobGraph } from "@/lib/jobs/graph-seed";

export async function GET(req: NextRequest) {
  try {
    // Ensure graph is seeded
    await seedJobGraph();

    // Load all nodes
    const { data: nodes } = await supabaseAdmin
      .from("job_graph_nodes")
      .select("*")
      .order("level", { ascending: true })
      .order("path", { ascending: true });

    // Build tree structure
    const nodeMap = new Map<string, any>();
    const rootNodes: any[] = [];

    for (const node of nodes || []) {
      const nodeWithChildren = { ...node, children: [] };
      nodeMap.set(node.id, nodeWithChildren);

      if (!node.parent_id) {
        rootNodes.push(nodeWithChildren);
      } else {
        const parent = nodeMap.get(node.parent_id);
        if (parent) {
          parent.children.push(nodeWithChildren);
        }
      }
    }

    return NextResponse.json(rootNodes);
  } catch (err: any) {
    console.error("[JobGraph] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load job graph" },
      { status: 500 }
    );
  }
}





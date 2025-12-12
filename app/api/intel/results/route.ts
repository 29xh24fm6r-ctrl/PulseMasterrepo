// Intelligence API - Get intelligence results for an entity
// app/api/intel/results/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { ensureTBNodeForEntity } from "@/lib/organism";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const entity_tb_node_id = searchParams.get("entity_tb_node_id");
    const entity_type = searchParams.get("entity_type") as "person" | "organization" | null;
    const entity_id = searchParams.get("entity_id");

    let tbNodeId = entity_tb_node_id;

    // Resolve TB node if entity_id provided
    if (!tbNodeId && entity_type && entity_id) {
      const nodeResult = await ensureTBNodeForEntity(userId, entity_type, entity_id);
      tbNodeId = nodeResult.tb_node_id;
    }

    if (!tbNodeId) {
      return jsonOk(
        { error: "entity_tb_node_id or (entity_type + entity_id) required" },
        { status: 400 }
      );
    }

    // Get memory fragments (intelligence evidence)
    const { data: fragments, error: fragmentsError } = await supabase
      .from("tb_memory_fragments")
      .select("*")
      .eq("owner_user_id", userId)
      .eq("entity_tb_node_id", tbNodeId)
      .eq("source_type", "intelligence")
      .order("created_at", { ascending: false })
      .limit(50);

    if (fragmentsError) throw fragmentsError;

    // Get source nodes
    const { data: edges, error: edgesError } = await supabase
      .from("tb_edges")
      .select("to_node_id, metadata")
      .eq("owner_user_id", userId)
      .eq("from_node_id", tbNodeId)
      .eq("edge_type", "has_source");

    if (edgesError) throw edgesError;

    const sourceNodeIds = edges?.map((e) => e.to_node_id) || [];
    const sources: any[] = [];

    if (sourceNodeIds.length > 0) {
      const { data: sourceNodes } = await supabase
        .from("tb_nodes")
        .select("*")
        .eq("owner_user_id", userId)
        .in("id", sourceNodeIds);

      sources.push(...(sourceNodes || []));
    }

    return jsonOk({
      entity_tb_node_id: tbNodeId,
      memory_fragments: fragments || [],
      sources: sources,
      total_findings: fragments?.length || 0,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}


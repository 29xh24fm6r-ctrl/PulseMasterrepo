// Workspace Context API
// GET /api/surfaces/workspace/context
// app/api/surfaces/workspace/context/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { ensureTBNodeForEntity } from "@/lib/organism";
import { dispatchCoach } from "@/lib/coaches/dispatch";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return jsonOk({ error: "entityType and entityId required" }, { status: 400 });
    }

    // Get entity details
    const tableName =
      entityType === "person"
        ? "crm_contacts"
        : entityType === "organization"
        ? "crm_organizations"
        : "crm_deals";

    const { data: entity } = await supabase
      .from(tableName)
      .select("*")
      .eq("owner_user_id", userId)
      .eq("id", entityId)
      .single();

    if (!entity) {
      return jsonOk({ error: "Entity not found" }, { status: 404 });
    }

    // Get timeline
    const contactField =
      entityType === "person" ? "contact_id" : entityType === "organization" ? "organization_id" : null;
    const dealField = entityType === "deal" ? "deal_id" : null;

    let timelineQuery = supabase
      .from("crm_interactions")
      .select("*")
      .eq("owner_user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(20);

    if (contactField && entity.id) {
      timelineQuery = timelineQuery.eq(contactField, entity.id);
    } else if (dealField && entity.id) {
      timelineQuery = timelineQuery.eq(dealField, entity.id);
    }

    const { data: timeline } = await timelineQuery;

    // Get brain highlights
    let brainHighlights: any[] = [];
    if (entity.tb_node_id) {
      const { data: fragments } = await supabase
        .from("tb_memory_fragments")
        .select("*")
        .eq("owner_user_id", userId)
        .eq("entity_tb_node_id", entity.tb_node_id)
        .order("created_at", { ascending: false })
        .limit(5);

      brainHighlights = fragments || [];
    } else {
      // Ensure TB node exists
      const nodeResult = await ensureTBNodeForEntity(userId, entityType as any, entityId);
      if (nodeResult.tb_node_id) {
        const { data: fragments } = await supabase
          .from("tb_memory_fragments")
          .select("*")
          .eq("owner_user_id", userId)
          .eq("entity_tb_node_id", nodeResult.tb_node_id)
          .order("created_at", { ascending: false })
          .limit(5);

        brainHighlights = fragments || [];
      }
    }

    // Get intel summary
    const intelSummary = entity.intel_summary || null;

    // Get coach note
    const coach = await dispatchCoach({
      surface: "workspace",
      entityType: entityType as any,
      entityId,
      context: {
        entity,
        timeline: timeline || [],
      },
      goal: "provide_context",
    });

    // Generate summary
    const summary = generateSummary(entityType, entity, timeline || []);

    // Next best action
    const nextBestAction = determineNextBestAction(entityType, entity, timeline || []);

    return jsonOk({
      entity: {
        type: entityType,
        id: entityId,
      },
      summary,
      timeline: timeline || [],
      brainHighlights,
      intelSummary,
      nextBestAction,
      coach: coach || undefined,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

function generateSummary(entityType: string, entity: any, timeline: any[]): string {
  if (entityType === "person") {
    return `${entity.full_name || "Contact"} - ${timeline.length} interactions. ${
      entity.primary_email || ""
    }`;
  } else if (entityType === "organization") {
    return `${entity.name || "Organization"} - ${timeline.length} interactions.`;
  } else {
    return `${entity.name || "Deal"} - Stage: ${entity.stage || "Unknown"}. ${
      timeline.length
    } interactions.`;
  }
}

function determineNextBestAction(entityType: string, entity: any, timeline: any[]): any {
  const lastInteraction = timeline[0];
  const daysSince = lastInteraction
    ? Math.floor((Date.now() - new Date(lastInteraction.occurred_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSince > 7) {
    return {
      title: "Follow up needed",
      label: "Schedule Touchpoint",
      action: `touchpoint:${entity.id}`,
    };
  }

  if (entityType === "deal" && entity.stage) {
    return {
      title: "Move deal forward",
      label: "Update Stage",
      action: `update:${entity.id}`,
    };
  }

  return {
    title: "Review details",
    label: "View Full Profile",
    action: `profile:${entity.id}`,
  };
}


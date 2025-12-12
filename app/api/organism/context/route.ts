// Organism Context API - For ContextMind hydration
// GET /api/organism/context
// app/api/organism/context/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { ensureTBNodeForEntity } from "@/lib/organism";
import { dispatchCoach } from "@/lib/coaches/dispatch";
import { supabaseServer } from "@/lib/supabase/server";
import type { ContextMindPayload } from "@/lib/surfaces/types";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as "contact" | "org" | "deal" | "thread" | "event" | null;
    const id = searchParams.get("id");

    if (!type || !id) {
      return jsonOk({ error: "type and id required" }, { status: 400 });
    }

    // Map surface types to organism types
    const entityTypeMap: Record<string, "person" | "organization" | "deal"> = {
      contact: "person",
      org: "organization",
      deal: "deal",
    };

    const organismType = entityTypeMap[type];
    if (!organismType) {
      return jsonOk({ error: "Unsupported entity type" }, { status: 400 });
    }

    // Get entity details
    const tableName =
      organismType === "person"
        ? "crm_contacts"
        : organismType === "organization"
        ? "crm_organizations"
        : "crm_deals";

    const { data: entity } = await supabase
      .from(tableName)
      .select("*")
      .eq("owner_user_id", userId)
      .eq("id", id)
      .single();

    if (!entity) {
      return jsonOk({ error: "Entity not found" }, { status: 404 });
    }

    // Get timeline
    const contactField = organismType === "person" ? "contact_id" : organismType === "organization" ? "organization_id" : null;
    const dealField = organismType === "deal" ? "deal_id" : null;

    let timelineQuery = supabase
      .from("crm_interactions")
      .select("id, type, subject, summary, occurred_at")
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
        .select("id, content")
        .eq("owner_user_id", userId)
        .eq("entity_tb_node_id", entity.tb_node_id)
        .order("created_at", { ascending: false })
        .limit(5);

      brainHighlights = (fragments || []).map((f) => ({
        id: f.id,
        text: f.content?.substring(0, 200) || "",
      }));
    } else {
      // Ensure TB node exists
      const nodeResult = await ensureTBNodeForEntity(userId, organismType, id);
      if (nodeResult.tb_node_id) {
        const { data: fragments } = await supabase
          .from("tb_memory_fragments")
          .select("id, content")
          .eq("owner_user_id", userId)
          .eq("entity_tb_node_id", nodeResult.tb_node_id)
          .order("created_at", { ascending: false })
          .limit(5);

        brainHighlights = (fragments || []).map((f) => ({
          id: f.id,
          text: f.content?.substring(0, 200) || "",
        }));
      }
    }

    // Get intel summary
    const intelSummary = entity.intel_summary || null;

    // Get coach note
    const coach = await dispatchCoach({
      surface: "workspace",
      entityType: organismType,
      entityId: id,
      context: {
        entity,
        timeline: timeline || [],
      },
      goal: "provide_context",
    });

    // Generate summary
    const entityTitle = entity.full_name || entity.name || "Unknown";
    const summary = `${entityTitle} - ${timeline?.length || 0} interactions. ${intelSummary ? `Intel: ${intelSummary.substring(0, 100)}` : ""}`;

    // Next best action
    const lastInteraction = timeline?.[0];
    const daysSince = lastInteraction
      ? Math.floor((Date.now() - new Date(lastInteraction.occurred_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const nextBestAction: ContextMindPayload["nextBestAction"] =
      daysSince > 7
        ? {
            title: "Follow up needed",
            label: "Schedule Touchpoint",
            href: `/organism/${organismType}/${id}`,
          }
        : organismType === "deal" && entity.stage
        ? {
            title: "Move deal forward",
            label: "Update Stage",
            href: `/organism/${organismType}/${id}`,
          }
        : {
            title: "Review details",
            label: "View Full Profile",
            href: `/organism/${organismType}/${id}`,
          };

    const payload: ContextMindPayload = {
      entity: {
        type,
        id,
        title: entityTitle,
      },
      summary,
      timeline: (timeline || []).map((t: any) => ({
        id: t.id,
        when: new Date(t.occurred_at).toISOString(),
        text: t.subject || t.summary || `${t.type} interaction`,
      })),
      brainHighlights,
      intelSummary,
      nextBestAction,
      coach: coach || undefined,
    };

    return jsonOk(payload);
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}


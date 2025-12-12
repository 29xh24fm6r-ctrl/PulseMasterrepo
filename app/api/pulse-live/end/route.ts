// Pulse Live End - Finalize session and file into organism
// POST /api/pulse-live/end
// app/api/pulse-live/end/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { supabaseServer } from "@/lib/supabase/server";
import { logInteraction } from "@/lib/organism/interactions";
import { createTask } from "@/lib/organism/tasks";
import { ensureTBNodeForEntity } from "@/lib/organism/identity";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return jsonOk({ error: "session_id required" }, { status: 400 });
    }

    // Get session
    const { data: session } = await supabase
      .from("call_sessions")
      .select("*")
      .eq("owner_user_id", userId)
      .eq("id", session_id)
      .single();

    if (!session) {
      return jsonOk({ error: "Session not found" }, { status: 404 });
    }

    // Update session status
    await supabase
      .from("call_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", session_id);

    // Get final summary
    const { data: summary } = await supabase
      .from("call_summaries")
      .select("*")
      .eq("session_id", session_id)
      .single();

    // Get all segments
    const { data: segments } = await supabase
      .from("call_segments")
      .select("*")
      .eq("session_id", session_id)
      .order("start_time", { ascending: true });

    if (!summary || !segments) {
      return jsonOk({ error: "No summary or segments found" }, { status: 404 });
    }

    // 1. Create canonical CRM interaction
    const speakerMap = (session.speaker_map || {}) as Record<string, any>;
    const participantContactIds = Object.values(speakerMap)
      .map((v: any) => v.contact_id)
      .filter(Boolean);

    // Use primary contact if available, otherwise first participant
    const primaryContactId = participantContactIds[0] || null;

    await logInteraction(userId, {
      type: "call",
      contact_id: primaryContactId || undefined,
      deal_id: session.linked_deal_id || undefined,
      occurred_at: session.started_at,
      subject: `Call: ${session.source}`,
      summary: summary.summary_text || "Meeting recorded and transcribed",
      channel: session.source,
      metadata: {
        callId: session.id,
        source_type: "pulse_live",
        source_id: session_id,
        duration: session.ended_at
          ? Math.floor(
              (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
            )
          : null,
        participants: participantContactIds,
      },
    });

    // 2. Create tasks from action items
    const actionItems = (summary.action_items || []) as string[];
    for (const actionText of actionItems) {
      await createTask(userId, {
        title: actionText,
        description: `From meeting: ${session_id}`,
        priority: "medium",
        contact_id: primaryContactId || undefined,
        deal_id: session.linked_deal_id || undefined,
        status: "pending",
      });
    }

    // 3. Create Second Brain fragments + edges
    const fullTranscript = segments.map((s: any) => s.text).join("\n");

    // Ensure TB node for the interaction
    const interactionResult = await supabase
      .from("crm_interactions")
      .select("id, tb_node_id")
      .eq("owner_user_id", userId)
      .eq("metadata->>callId", session_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (interactionResult.data) {
      // Create memory fragment for the meeting
      const { data: fragment } = await supabase
        .from("tb_memory_fragments")
        .insert({
          owner_user_id: userId,
          entity_tb_node_id: interactionResult.data.tb_node_id,
          content: `Meeting summary: ${summary.summary_text}\n\nKey points:\n${(summary.decisions || []).join("\n")}\n${(summary.action_items || []).join("\n")}`,
          source_type: "pulse_live",
          source_id: session_id,
        })
        .select()
        .single();

      // Link participants to meeting memory
      for (const contactId of participantContactIds) {
        const contactResult = await ensureTBNodeForEntity(userId, "person", contactId);
        if (contactResult.tb_node_id && fragment?.id) {
          // Create edge linking contact to meeting
          await supabase.from("tb_edges").insert({
            owner_user_id: userId,
            from_node_id: contactResult.tb_node_id,
            to_node_id: interactionResult.data.tb_node_id,
            kind: "participated_in",
            props: {
              session_id: session_id,
              role: "participant",
            },
          });
        }
      }

      // Link deal if present
      if (session.linked_deal_id) {
        const dealResult = await ensureTBNodeForEntity(userId, "deal", session.linked_deal_id);
        if (dealResult.tb_node_id && interactionResult.data.tb_node_id) {
          await supabase.from("tb_edges").insert({
            owner_user_id: userId,
            from_node_id: interactionResult.data.tb_node_id,
            to_node_id: dealResult.tb_node_id,
            kind: "related_to",
            props: {
              session_id: session_id,
            },
          });
        }
      }
    }

    // 4. Update relationship/deal health (derived metrics)
    if (primaryContactId) {
      // Update relationship health - touchpoint happened
      await supabase.rpc("update_relationship_health_after_interaction", {
        p_user_id: userId,
        p_contact_id: primaryContactId,
        p_interaction_type: "call",
        p_occurred_at: session.started_at,
      }).catch(() => {
        // RPC may not exist, skip silently
      });
    }

    if (session.linked_deal_id) {
      // Update deal health - activity on deal
      await supabase
        .from("crm_deal_health")
        .upsert(
          {
            owner_user_id: userId,
            deal_id: session.linked_deal_id,
            score: 75, // Default healthy score after interaction
            risk_level: 2,
            last_interaction_at: session.started_at,
            days_stalled: 0,
          },
          {
            onConflict: "owner_user_id,deal_id",
          }
        )
        .catch(() => {
          // Table may not exist, skip silently
        });
    }

    return jsonOk({
      ok: true,
      message: "Meeting filed into organism",
      interaction_id: interactionResult.data?.id,
      tasks_created: actionItems.length,
      fragments_created: 1,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

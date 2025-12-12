// Pulse Live Status API
// GET /api/pulse-live/status
// app/api/pulse-live/status/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { supabaseServer } from "@/lib/supabase/server";
import { evaluateNudge, generateNudgeMessage } from "@/lib/pulse-live/nudgePolicy";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const session_id = searchParams.get("session_id");

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

    // Get recent segments (last 20)
    const { data: segments } = await supabase
      .from("call_segments")
      .select("*, crm_contacts(full_name)")
      .eq("session_id", session_id)
      .order("start_time", { ascending: true })
      .limit(20);

    // Get summary
    const { data: summary } = await supabase
      .from("call_summaries")
      .select("*")
      .eq("session_id", session_id)
      .single();

    // Get current speaker (most recent segment)
    const currentSegment = segments && segments.length > 0 ? segments[segments.length - 1] : null;
    const currentSpeaker = currentSegment
      ? {
          speaker_key: currentSegment.speaker_key,
          label: (currentSegment as any).crm_contacts?.full_name || currentSegment.speaker_key,
          contact_id: currentSegment.contact_id || undefined,
        }
      : undefined;

    // Format segments for UI
    const formattedSegments = (segments || []).map((seg: any) => {
      const minutes = Math.floor(seg.start_time / 60);
      const seconds = Math.floor(seg.start_time % 60);
      const at = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      // Determine tags based on summary data
      const tags: string[] = [];
      if (summary?.action_items?.some((a: string) => seg.text.includes(a.substring(0, 20)))) {
        tags.push("Action");
      }
      if (summary?.risks?.some((r: string) => seg.text.includes(r.substring(0, 20)))) {
        tags.push("Risk");
      }
      if (summary?.decisions?.some((d: string) => seg.text.includes(d.substring(0, 20)))) {
        tags.push("Decision");
      }

      return {
        id: seg.id,
        at,
        speaker: (seg as any).crm_contacts?.full_name || seg.speaker_key,
        text: seg.text,
        tags: tags.length > 0 ? tags : undefined,
      };
    });

    // Extract artifacts
    const actions = (summary?.action_items || []).map((text: string, idx: number) => ({
      id: `action-${idx}`,
      text,
      owner: "You", // TODO: Extract from segment
      due: undefined, // TODO: Extract from segment
    }));

    const decisions = (summary?.decisions || []).map((text: string, idx: number) => ({
      id: `decision-${idx}`,
      text,
    }));

    const risks = (summary?.risks || []).map((text: string, idx: number) => ({
      id: `risk-${idx}`,
      text,
    }));

    // Calculate criticality
    let criticality = 0;
    if (summary) {
      if (summary.objections && summary.objections.length > 0) criticality += 0.3;
      if (summary.risks && summary.risks.length > 0) criticality += 0.2;
      if (summary.decisions && summary.decisions.length > 0) criticality += 0.2;
      criticality = Math.min(1, criticality);
    }

    // Generate coach nudge if needed
    let coach_nudge = null;
    const speakerMap = (session.speaker_map || {}) as Record<string, any>;
    const coachEnabled = speakerMap.coach_enabled !== false; // Default to true

    if (coachEnabled && criticality > 0.6 && summary) {
      const nudgeDecision = evaluateNudge(criticality);
      if (nudgeDecision.should_nudge) {
        const nudgeText = generateNudgeMessage(
          summary.summary_text || "",
          {
            objections: summary.objections || [],
            risks: summary.risks || [],
            decisions: summary.decisions || [],
            action_items: summary.action_items || [],
          },
          criticality
        );

        if (nudgeText) {
          coach_nudge = {
            id: `nudge-${Date.now()}`,
            text: nudgeText,
            confidence: criticality,
          };
        }
      }
    }

    // Build context
    const context: any = {};

    // Get people from speaker map
    const contactIds = Object.values(speakerMap)
      .map((v: any) => v.contact_id)
      .filter(Boolean);
    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from("crm_contacts")
        .select("id, full_name")
        .eq("owner_user_id", userId)
        .in("id", contactIds);
      if (contacts) {
        context.people = contacts.map((c) => ({ id: c.id, name: c.full_name || "Unknown" }));
      }
    }

    // Get deal if linked
    if (session.linked_deal_id) {
      const { data: deal } = await supabase
        .from("crm_deals")
        .select("id, name")
        .eq("owner_user_id", userId)
        .eq("id", session.linked_deal_id)
        .single();
      if (deal) {
        context.deal = { id: deal.id, name: deal.name || "Unknown Deal" };
      }
    }

    // Check for memory/intel
    if (contactIds.length > 0) {
      const { data: contact } = await supabase
        .from("crm_contacts")
        .select("tb_node_id, intel_summary")
        .eq("owner_user_id", userId)
        .in("id", contactIds)
        .not("tb_node_id", "is", null)
        .limit(1)
        .single();

      if (contact?.tb_node_id) {
        context.memory = { id: contact.tb_node_id, hint: "Prior meeting context available" };
      }
      if (contact?.intel_summary) {
        context.intel = { id: "intel-1", hint: contact.intel_summary.substring(0, 50) + "..." };
      }
    }

    // Filing state
    const filing = session.status === "ended"
      ? { state: "done" as const, message: "Captured. Logged. Linked." }
      : { state: "idle" as const };

    const response = {
      session_id: session.id,
      is_recording: session.status === "active",
      coach_enabled: coachEnabled,
      criticality,
      current_speaker: currentSpeaker,
      segments: formattedSegments,
      artifacts: {
        actions,
        decisions,
        risks,
      },
      coach_nudge: coach_nudge,
      context,
      filing,
    };

    return jsonOk(response);
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

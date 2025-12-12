/**
 * Full Brain Context Pack for Pulse Live
 * lib/pulse-live/context.ts
 */

import { supabaseServer } from "@/lib/supabase/server";

export interface PulseLiveContext {
  crm_history: {
    contacts: Array<{ id: string; name: string; summary?: string }>;
    organizations: Array<{ id: string; name: string; domain?: string }>;
    deals: Array<{ id: string; name: string; stage: string; amount?: number }>;
    recent_interactions: Array<{ type: string; summary: string; occurred_at: string }>;
  };
  relationship_health: Array<{
    contact_id: string;
    health_score?: number;
    last_interaction?: string;
  }>;
  second_brain: {
    highlights: Array<{ content: string; created_at: string }>;
    prior_meetings: Array<{ summary: string; date: string }>;
  };
  deal_context?: {
    deal_id: string;
    stage: string;
    blockers?: string[];
    next_milestone?: string;
  };
  intel?: {
    summary?: string;
    sources?: string[];
  };
}

/**
 * Build full context pack for Pulse Live session
 */
export async function buildPulseLiveContext({
  owner_user_id,
  session_id,
}: {
  owner_user_id: string;
  session_id: string;
}): Promise<PulseLiveContext> {
  const supabase = supabaseServer();

  // Get session details
  const { data: session } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("id", session_id)
    .eq("owner_user_id", owner_user_id)
    .single();

  if (!session) {
    throw new Error("Session not found");
  }

  const context: PulseLiveContext = {
    crm_history: {
      contacts: [],
      organizations: [],
      deals: [],
      recent_interactions: [],
    },
    relationship_health: [],
    second_brain: {
      highlights: [],
      prior_meetings: [],
    },
  };

  // Get linked deal context
  if (session.linked_deal_id) {
    const { data: deal } = await supabase
      .from("crm_deals")
      .select("*, crm_contacts(*), crm_organizations(*)")
      .eq("id", session.linked_deal_id)
      .eq("owner_user_id", owner_user_id)
      .single();

    if (deal) {
      context.deal_context = {
        deal_id: deal.id,
        stage: deal.stage || "unknown",
      };
    }
  }

  // Get participant contacts
  const participantContacts: string[] = [];
  if (session.speaker_map) {
    for (const [key, value] of Object.entries(session.speaker_map as any)) {
      if ((value as any).contact_id) {
        participantContacts.push((value as any).contact_id);
      }
    }
  }

  // Also check calendar attendees
  if (session.calendar_event_id) {
    const { data: event } = await supabase
      .from("calendar_events_cache")
      .select("attendees")
      .eq("id", session.calendar_event_id)
      .eq("owner_user_id", owner_user_id)
      .single();

    if (event?.attendees) {
      // Try to resolve attendees to contacts
      const emails = Array.isArray(event.attendees)
        ? event.attendees.map((a: any) => (typeof a === "string" ? a : a.email))
        : [];
      const { data: contacts } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("owner_user_id", owner_user_id)
        .in("primary_email", emails);
      if (contacts) {
        participantContacts.push(...contacts.map((c) => c.id));
      }
    }
  }

  // Get CRM history for participants
  if (participantContacts.length > 0) {
    const { data: contacts } = await supabase
      .from("crm_contacts")
      .select("id, full_name, intel_summary")
      .eq("owner_user_id", owner_user_id)
      .in("id", participantContacts);

    context.crm_history.contacts = (contacts || []).map((c) => ({
      id: c.id,
      name: c.full_name || "Unknown",
      summary: c.intel_summary || undefined,
    }));

    // Get organizations
    const { data: orgs } = await supabase
      .from("crm_organizations")
      .select("id, name, domain")
      .eq("owner_user_id", owner_user_id)
      .in(
        "id",
        (contacts || [])
          .map((c: any) => c.organization_id)
          .filter(Boolean)
      );

    context.crm_history.organizations = (orgs || []).map((o) => ({
      id: o.id,
      name: o.name || "Unknown",
      domain: o.domain || undefined,
    }));

    // Get recent interactions
    const { data: interactions } = await supabase
      .from("crm_interactions")
      .select("type, summary, occurred_at")
      .eq("owner_user_id", owner_user_id)
      .in("contact_id", participantContacts)
      .order("occurred_at", { ascending: false })
      .limit(10);

    context.crm_history.recent_interactions = (interactions || []).map((i) => ({
      type: i.type || "unknown",
      summary: i.summary || "",
      occurred_at: i.occurred_at,
    }));
  }

  // Get linked deal details
  if (session.linked_deal_id) {
    const { data: deal } = await supabase
      .from("crm_deals")
      .select("id, name, stage, amount")
      .eq("id", session.linked_deal_id)
      .eq("owner_user_id", owner_user_id)
      .single();

    if (deal) {
      context.crm_history.deals = [
        {
          id: deal.id,
          name: deal.name || "Unknown Deal",
          stage: deal.stage || "unknown",
          amount: deal.amount || undefined,
        },
      ];
    }
  }

  // Get Second Brain highlights
  const tbNodeIds: string[] = [];
  if (participantContacts.length > 0) {
    const { data: contacts } = await supabase
      .from("crm_contacts")
      .select("tb_node_id")
      .eq("owner_user_id", owner_user_id)
      .in("id", participantContacts)
      .not("tb_node_id", "is", null);
    if (contacts) {
      tbNodeIds.push(...contacts.map((c: any) => c.tb_node_id).filter(Boolean));
    }
  }

  if (tbNodeIds.length > 0) {
    const { data: fragments } = await supabase
      .from("tb_memory_fragments")
      .select("content, created_at")
      .eq("owner_user_id", owner_user_id)
      .in("entity_tb_node_id", tbNodeIds)
      .order("created_at", { ascending: false })
      .limit(5);

    context.second_brain.highlights = (fragments || []).map((f) => ({
      content: f.content || "",
      created_at: f.created_at,
    }));
  }

  // Get prior meetings (from call sessions or interactions)
  if (participantContacts.length > 0) {
    const { data: priorSessions } = await supabase
      .from("call_sessions")
      .select("id, started_at, call_summaries(summary_text)")
      .eq("owner_user_id", owner_user_id)
      .in("id", []) // Would need to query by participant
      .eq("status", "ended")
      .order("started_at", { ascending: false })
      .limit(3);

    // Also check interactions
    const { data: meetingInteractions } = await supabase
      .from("crm_interactions")
      .select("summary, occurred_at")
      .eq("owner_user_id", owner_user_id)
      .in("contact_id", participantContacts)
      .eq("type", "meeting")
      .order("occurred_at", { ascending: false })
      .limit(3);

    context.second_brain.prior_meetings = (meetingInteractions || []).map((i) => ({
      summary: i.summary || "",
      date: i.occurred_at,
    }));
  }

  // Get intel summary from contacts/orgs
  if (context.crm_history.contacts.length > 0) {
    const contactId = context.crm_history.contacts[0].id;
    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("intel_summary")
      .eq("id", contactId)
      .eq("owner_user_id", owner_user_id)
      .single();

    if (contact?.intel_summary) {
      context.intel = {
        summary: contact.intel_summary,
      };
    }
  }

  return context;
}


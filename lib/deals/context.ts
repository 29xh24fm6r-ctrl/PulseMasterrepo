// Deal Context Loader (Schema-Aligned)
// lib/deals/context.ts

import { supabaseAdmin } from "@/lib/supabase";
import { DealContext, DealParticipant, DealCommItem } from "./types";

/**
 * Load complete context for a deal using actual Supabase schema
 */
export async function loadDealContext(
  userId: string,
  dealId: string
): Promise<DealContext | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load deal
  const { data: deal } = await supabaseAdmin
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .eq("user_id", dbUserId)
    .single();

  if (!deal) {
    return null;
  }

  // 2. Load participants with contact info and profiles
  const { data: participants } = await supabaseAdmin
    .from("deal_participants")
    .select("*, contacts(*)")
    .eq("deal_id", dealId);

  const participantsWithProfiles: DealParticipant[] = await Promise.all(
    (participants || []).map(async (p) => {
      const contact = (p.contacts as any) || {};
      const contactId = p.contact_id;

      if (!contactId) {
        return {
          contactId: "",
          name: contact.name || "Unknown",
          email: contact.email || null,
          phone: contact.phone || null,
          role: p.role || null,
          importance: p.importance || null,
        };
      }

      // Load profiles
      const [behaviorRes, identityRes, playbookRes, relationshipRes] = await Promise.all([
        supabaseAdmin
          .from("contact_behavior_profiles")
          .select("*")
          .eq("user_id", dbUserId)
          .eq("contact_id", contactId)
          .maybeSingle(),
        supabaseAdmin
          .from("contact_identity_intel")
          .select("summarised_identity")
          .eq("user_id", dbUserId)
          .eq("contact_id", contactId)
          .maybeSingle(),
        supabaseAdmin
          .from("contact_playbooks")
          .select("*")
          .eq("user_id", dbUserId)
          .eq("contact_id", contactId)
          .maybeSingle(),
        supabaseAdmin
          .from("contact_relationship_scores")
          .select("*")
          .eq("user_id", dbUserId)
          .eq("contact_id", contactId)
          .maybeSingle(),
      ]);

      return {
        contactId,
        name: contact.name || "Unknown",
        email: contact.email || null,
        phone: contact.phone || null,
        role: p.role || null,
        importance: p.importance || null,
        relationshipScores: relationshipRes.data || null,
        behaviorProfile: behaviorRes.data || null,
        identityIntelSummary: identityRes.data?.summarised_identity || null,
        playbook: playbookRes.data || null,
      };
    })
  );

  // 3. Load communications from actual tables
  const comms: DealCommItem[] = [];

  // Email items
  const { data: emailItems } = await supabaseAdmin
    .from("email_items")
    .select("id, subject, snippet, sent_at, received_at, deal_id")
    .eq("deal_id", dealId)
    .order("sent_at", { ascending: false, nullsLast: true })
    .order("received_at", { ascending: false, nullsLast: true })
    .limit(50);

  for (const item of emailItems || []) {
    const occurredAt = item.sent_at || item.received_at;
    if (occurredAt) {
      comms.push({
        id: item.id,
        channel: "email",
        occurredAt: new Date(occurredAt),
        direction: item.sent_at ? "outgoing" : item.received_at ? "incoming" : "unknown",
        subjectOrSnippet: item.subject || item.snippet || "",
        dealId: item.deal_id,
      });
    }
  }

  // SMS messages
  const { data: smsMessages } = await supabaseAdmin
    .from("sms_messages")
    .select("id, body, sent_at, received_at, deal_id")
    .eq("deal_id", dealId)
    .order("sent_at", { ascending: false, nullsLast: true })
    .order("received_at", { ascending: false, nullsLast: true })
    .limit(50);

  for (const msg of smsMessages || []) {
    const occurredAt = msg.sent_at || msg.received_at;
    if (occurredAt) {
      comms.push({
        id: msg.id,
        channel: "sms",
        occurredAt: new Date(occurredAt),
        direction: msg.sent_at ? "outgoing" : msg.received_at ? "incoming" : "unknown",
        subjectOrSnippet: msg.body?.substring(0, 100) || "",
        dealId: msg.deal_id,
      });
    }
  }

  // Calls
  const { data: calls } = await supabaseAdmin
    .from("calls")
    .select("id, summary, started_at, deal_id")
    .eq("deal_id", dealId)
    .order("started_at", { ascending: false })
    .limit(50);

  for (const call of calls || []) {
    if (call.started_at) {
      comms.push({
        id: call.id,
        channel: "call",
        occurredAt: new Date(call.started_at),
        direction: "unknown", // Calls are bidirectional
        subjectOrSnippet: call.summary || "Call",
        dealId: call.deal_id,
      });
    }
  }

  // Voicemails
  const { data: voicemails } = await supabaseAdmin
    .from("voicemails")
    .select("id, transcript, received_at, deal_id")
    .eq("deal_id", dealId)
    .order("received_at", { ascending: false })
    .limit(50);

  for (const vm of voicemails || []) {
    if (vm.received_at) {
      comms.push({
        id: vm.id,
        channel: "voicemail",
        occurredAt: new Date(vm.received_at),
        direction: "incoming",
        subjectOrSnippet: vm.transcript?.substring(0, 100) || "Voicemail",
        dealId: vm.deal_id,
      });
    }
  }

  // Sort all comms by occurredAt DESC
  comms.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  // 4. Load tasks linked to deal
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, due_at")
    .eq("deal_id", dealId)
    .order("due_at", { ascending: true, nullsLast: true });

  // 5. Load latest intelligence
  const { data: lastIntel } = await supabaseAdmin
    .from("deal_intelligence")
    .select("*")
    .eq("deal_id", dealId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    deal: {
      id: deal.id,
      name: deal.name,
      description: deal.description || null,
      value: deal.value || null,
      status: deal.status || null,
      stage: deal.stage || null,
      priority: deal.priority || null,
      dueDate: deal.due_date ? new Date(deal.due_date) : null,
      createdAt: new Date(deal.created_at),
      updatedAt: new Date(deal.updated_at),
    },
    participants: participantsWithProfiles,
    comms: comms.slice(0, 50), // Limit to 50 most recent
    tasks: (tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueAt: t.due_at ? new Date(t.due_at) : null,
    })),
    lastIntel: lastIntel
      ? {
          riskSummary: lastIntel.risk_summary || null,
          momentumScore: lastIntel.momentum_score || null,
          generatedAt: new Date(lastIntel.generated_at),
        }
      : null,
  };
}


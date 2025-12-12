// Meeting Briefing Generator
// lib/meetings/briefing.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import { linkEventToContacts, linkEventToDeal } from "./linking";

export interface MeetingBriefing {
  title: string;
  startTime: string;
  endTime?: string | null;
  contacts: {
    contactId: string;
    name: string;
    roleSummary?: string | null;
  }[];
  deals: {
    dealId: string;
    name: string;
    stage?: string | null;
    value?: number | null;
  }[];
  oneLiner: string;
  keyObjectives: string[];
  relationshipNotes: string[];
  landmines: string[];
  recommendedTone: string;
  suggestedOpeningLine: string;
}

/**
 * Generate a meeting briefing for a calendar event
 */
export async function generateMeetingBriefingForEvent(
  userId: string,
  eventId: string
): Promise<MeetingBriefing> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load event from calendar_events_cache
  const { data: event } = await supabaseAdmin
    .from("calendar_events_cache")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    throw new Error("Event not found");
  }

  // 2. Link to contacts
  const attendeeEmails = event.attendees || [];
  const linkedContacts = await linkEventToContacts(
    userId,
    event.title || "",
    event.description || null,
    attendeeEmails
  );

  // 3. Link to deal
  const linkedDeal = await linkEventToDeal(
    userId,
    event.title || "",
    event.description || null,
    linkedContacts.contactNames
  );

  // 4. Load contact profiles
  const contactProfiles = await Promise.all(
    linkedContacts.contactIds.map(async (contactId) => {
      const [relationshipRes, identityRes, playbookRes] = await Promise.all([
        supabaseAdmin
          .from("contact_relationship_scores")
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
      ]);

      const contact = await supabaseAdmin
        .from("contacts")
        .select("name")
        .eq("id", contactId)
        .single();

      return {
        contactId,
        name: contact.data?.name || "Unknown",
        relationshipScores: relationshipRes.data || null,
        identitySummary: identityRes.data?.summarised_identity || null,
        playbook: playbookRes.data || null,
      };
    })
  );

  // 5. Load deal context if linked
  let dealContext = null;
  if (linkedDeal.dealId) {
    const { data: deal } = await supabaseAdmin
      .from("deals")
      .select("name, stage, value")
      .eq("id", linkedDeal.dealId)
      .single();

    const { data: intel } = await supabaseAdmin
      .from("deal_intelligence")
      .select("risk_summary, blockers, next_steps")
      .eq("deal_id", linkedDeal.dealId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    dealContext = {
      deal,
      intel,
    };
  }

  // 6. Build LLM prompt
  const contactsSummary = contactProfiles
    .map((p) => {
      const trust = p.relationshipScores?.trust_score
        ? Math.round(p.relationshipScores.trust_score * 100)
        : "unknown";
      return `- ${p.name}: Trust ${trust}%, ${p.identitySummary ? `Identity: ${p.identitySummary.substring(0, 100)}` : ""}`;
    })
    .join("\n");

  const dealSummary = dealContext
    ? `Deal: ${dealContext.deal?.name} (Stage: ${dealContext.deal?.stage || "unknown"}, Value: $${dealContext.deal?.value?.toLocaleString() || "unknown"})
Risk: ${dealContext.intel?.risk_summary || "No intelligence available"}
Blockers: ${dealContext.intel?.blockers ? JSON.stringify(dealContext.intel.blockers).substring(0, 200) : "None"}
Next Steps: ${dealContext.intel?.next_steps ? JSON.stringify(dealContext.intel.next_steps).substring(0, 200) : "None"}`
    : "No deal linked";

  const prompt = `You are Pulse, an AI assistant preparing a pre-meeting briefing for a user.

Meeting Details:
Title: ${event.title || "Untitled"}
Description: ${event.description || "No description"}
Start: ${event.start_time || "Unknown"}
Attendees: ${linkedContacts.contactNames.join(", ") || "Unknown"}

Participants:
${contactsSummary || "No contacts matched"}

Deal Context:
${dealSummary}

Generate a comprehensive meeting briefing that includes:

1. One-liner: A single sentence summary of what this meeting is about
2. Key Objectives: 3-5 specific goals for this meeting
3. Relationship Notes: Important context about each participant (communication style, preferences, recent interactions, trust level)
4. Landmines: Things to avoid saying or doing (based on relationship intel and deal context)
5. Recommended Tone: How to approach this meeting (formal, casual, empathetic, direct, etc.)
6. Suggested Opening Line: A natural opening line to start the conversation

Return JSON:
{
  "oneLiner": "string",
  "keyObjectives": ["string", "string"],
  "relationshipNotes": ["string", "string"],
  "landmines": ["string", "string"],
  "recommendedTone": "string",
  "suggestedOpeningLine": "string"
}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete({
      messages: [
        {
          role: "system",
          content:
            "You are Pulse, an AI assistant that prepares detailed meeting briefings. Be concise, actionable, and insightful.",
        },
        { role: "user", content: prompt },
      ],
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as any;

    return {
      title: event.title || "Untitled Meeting",
      startTime: event.start_time || "",
      endTime: event.end_time || null,
      contacts: contactProfiles.map((p) => ({
        contactId: p.contactId,
        name: p.name,
        roleSummary: p.identitySummary || null,
      })),
      deals: linkedDeal.dealId
        ? [
            {
              dealId: linkedDeal.dealId,
              name: linkedDeal.dealName || "Unknown Deal",
              stage: dealContext?.deal?.stage || null,
              value: dealContext?.deal?.value || null,
            },
          ]
        : [],
      oneLiner: parsed.oneLiner || "Meeting briefing",
      keyObjectives: Array.isArray(parsed.keyObjectives) ? parsed.keyObjectives : [],
      relationshipNotes: Array.isArray(parsed.relationshipNotes) ? parsed.relationshipNotes : [],
      landmines: Array.isArray(parsed.landmines) ? parsed.landmines : [],
      recommendedTone: parsed.recommendedTone || "Professional",
      suggestedOpeningLine: parsed.suggestedOpeningLine || "Hi, thanks for meeting with me today.",
    };
  } catch (err) {
    console.error("[MeetingBriefing] LLM generation failed:", err);
    // Return default briefing
    return {
      title: event.title || "Untitled Meeting",
      startTime: event.start_time || "",
      endTime: event.end_time || null,
      contacts: contactProfiles.map((p) => ({
        contactId: p.contactId,
        name: p.name,
        roleSummary: null,
      })),
      deals: linkedDeal.dealId
        ? [
            {
              dealId: linkedDeal.dealId,
              name: linkedDeal.dealName || "Unknown Deal",
              stage: null,
              value: null,
            },
          ]
        : [],
      oneLiner: "Meeting briefing unavailable",
      keyObjectives: [],
      relationshipNotes: [],
      landmines: [],
      recommendedTone: "Professional",
      suggestedOpeningLine: "Hi, thanks for meeting with me today.",
    };
  }
}





// Meeting Detector - Finds upcoming meetings needing prep
// lib/autopilot/detectors/meetings.ts

import { supabaseAdmin } from "@/lib/supabase";
import { AutopilotCandidate } from "../types";

/**
 * Detect upcoming meetings needing prep
 */
export async function detectMeetingActions(
  userId: string
): Promise<AutopilotCandidate[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const candidates: AutopilotCandidate[] = [];

  // Find upcoming meetings in next 24 hours
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: events } = await supabaseAdmin
    .from("calendar_events_cache")
    .select("id, title, start_time, end_time, description, attendees")
    .eq("user_id", dbUserId)
    .gte("start_time", now.toISOString())
    .lte("start_time", tomorrow.toISOString())
    .order("start_time", { ascending: true })
    .limit(20);

  if (!events || events.length === 0) {
    return candidates;
  }

  for (const event of events) {
    // Check if briefing exists
    const { count: briefingCount } = await supabaseAdmin
      .from("third_brain_memories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .ilike("content", `%${event.title}%`)
      .ilike("content", "%briefing%")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Check if attendees include important contacts
    const attendeeEmails = event.attendees || [];
    let hasImportantContact = false;

    if (attendeeEmails.length > 0) {
      const { data: contacts } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("user_id", dbUserId)
        .in("email", attendeeEmails)
        .limit(1);

      if (contacts && contacts.length > 0) {
        const contactId = contacts[0].id;
        const { data: relationship } = await supabaseAdmin
          .from("contact_relationship_scores")
          .select("trust_score, influence_score")
          .eq("user_id", dbUserId)
          .eq("contact_id", contactId)
          .maybeSingle();

        if (relationship) {
          const trust = relationship.trust_score || 0;
          const influence = relationship.influence_score || 0;
          hasImportantContact = trust > 0.5 || influence > 0.5;
        }
      }
    }

    // Risk level based on importance and prep status
    let riskLevel: "low" | "medium" | "high" = "low";
    if (hasImportantContact && (briefingCount || 0) === 0) {
      riskLevel = "high";
    } else if (hasImportantContact || (briefingCount || 0) === 0) {
      riskLevel = "medium";
    }

    if (riskLevel !== "low") {
      candidates.push({
        type: "meeting_prep",
        riskLevel,
        context: {
          event_id: event.id,
          event_title: event.title,
          start_time: event.start_time,
          has_important_contact: hasImportantContact,
          has_briefing: (briefingCount || 0) > 0,
        },
        summary: `Meeting prep needed: ${event.title} (${new Date(event.start_time).toLocaleString()})`,
      });
    }
  }

  return candidates;
}





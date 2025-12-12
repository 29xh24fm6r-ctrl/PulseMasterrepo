// Meeting Linking - Links calendar events to contacts and deals
// lib/meetings/linking.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

export interface LinkedContacts {
  contactIds: string[];
  contactNames: string[];
}

export interface LinkedDeal {
  dealId: string | null;
  dealName: string | null;
}

/**
 * Link calendar event to contacts by matching attendee emails
 */
export async function linkEventToContacts(
  userId: string,
  eventTitle: string,
  eventDescription: string | null,
  attendeeEmails: string[]
): Promise<LinkedContacts> {
  if (attendeeEmails.length === 0) {
    return { contactIds: [], contactNames: [] };
  }

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Find contacts by email
  const { data: contacts } = await supabaseAdmin
    .from("contacts")
    .select("id, name, email")
    .eq("user_id", dbUserId)
    .in("email", attendeeEmails);

  const contactIds = (contacts || []).map((c) => c.id);
  const contactNames = (contacts || []).map((c) => c.name || c.email || "Unknown");

  return { contactIds, contactNames };
}

/**
 * Link calendar event to a deal using LLM inference
 */
export async function linkEventToDeal(
  userId: string,
  eventTitle: string,
  eventDescription: string | null,
  contactNames: string[]
): Promise<LinkedDeal> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get list of active deals for context
  const { data: deals } = await supabaseAdmin
    .from("deals")
    .select("id, name")
    .eq("user_id", dbUserId)
    .in("status", ["active", "stalled"])
    .limit(50);

  if (!deals || deals.length === 0) {
    return { dealId: null, dealName: null };
  }

  // Use LLM to infer which deal this event is about
  const dealsList = deals.map((d) => `- ${d.name} (ID: ${d.id})`).join("\n");
  const contactsList = contactNames.length > 0 ? contactNames.join(", ") : "None";

  const prompt = `You are analyzing a calendar event to determine if it's related to a specific business deal.

Event Title: ${eventTitle}
Event Description: ${eventDescription || "No description"}
Attendees: ${contactsList}

Active Deals:
${dealsList}

Based on the event title, description, and attendees, determine if this event is clearly related to one of the deals listed above.

If there's a clear match (e.g., deal name in title, borrower/client name matches, deal-specific context), return the deal ID.
If it's ambiguous or not clearly related, return null.

Return ONLY a JSON object:
{
  "dealId": "uuid-or-null",
  "dealName": "deal-name-or-null",
  "confidence": "high|medium|low"
}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that links calendar events to business deals.",
        },
        { role: "user", content: prompt },
      ],
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as any;

    // Validate dealId exists
    if (parsed.dealId && parsed.confidence !== "low") {
      const deal = deals.find((d) => d.id === parsed.dealId);
      if (deal) {
        return { dealId: deal.id, dealName: deal.name };
      }
    }

    return { dealId: null, dealName: null };
  } catch (err) {
    console.error("[MeetingLinking] LLM inference failed:", err);
    return { dealId: null, dealName: null };
  }
}





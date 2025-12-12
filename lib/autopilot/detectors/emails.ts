// Email Detector - Finds unreplied important emails
// lib/autopilot/detectors/emails.ts

import { supabaseAdmin } from "@/lib/supabase";
import { AutopilotCandidate } from "../types";

/**
 * Detect unreplied important emails
 */
export async function detectEmailFollowups(
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

  // Find emails from important contacts with no recent reply
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Get email items that are incoming and not replied to
  const { data: emailItems } = await supabaseAdmin
    .from("email_items")
    .select("id, subject, snippet, received_at, from_address")
    .eq("user_id", dbUserId)
    .eq("is_incoming", true)
    .gte("received_at", threeDaysAgo.toISOString())
    .order("received_at", { ascending: false })
    .limit(50);

  if (!emailItems || emailItems.length === 0) {
    return candidates;
  }

  // Check if there's a reply (outgoing email to same thread/contact)
  for (const item of emailItems) {
    // Check for recent replies to this sender
    const { count: replyCount } = await supabaseAdmin
      .from("email_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .eq("is_incoming", false)
      .eq("to_address", item.from_address)
      .gte("sent_at", item.received_at || "");

    if ((replyCount || 0) === 0) {
      // Check if contact is important (has relationship score or is in deals)
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("id, name")
        .eq("user_id", dbUserId)
        .eq("email", item.from_address)
        .maybeSingle();

      let riskLevel: "low" | "medium" | "high" = "low";
      if (contact) {
        const { data: relationship } = await supabaseAdmin
          .from("contact_relationship_scores")
          .select("trust_score, influence_score")
          .eq("user_id", dbUserId)
          .eq("contact_id", contact.id)
          .maybeSingle();

        if (relationship) {
          const trust = relationship.trust_score || 0;
          const influence = relationship.influence_score || 0;
          if (trust > 0.7 || influence > 0.7) {
            riskLevel = "high";
          } else if (trust > 0.5 || influence > 0.5) {
            riskLevel = "medium";
          }
        }

        // Check if contact is in active deals
        const { count: dealCount } = await supabaseAdmin
          .from("deal_participants")
          .select("*", { count: "exact", head: true })
          .eq("contact_id", contact.id)
          .in("deal_id", [
            supabaseAdmin
              .from("deals")
              .select("id")
              .eq("user_id", dbUserId)
              .in("status", ["active", "stalled"]),
          ]);

        if (dealCount && dealCount > 0) {
          riskLevel = "high";
        }
      }

      candidates.push({
        type: "email_followup",
        riskLevel,
        context: {
          email_item_id: item.id,
          contact_id: contact?.id || null,
          from_address: item.from_address,
          subject: item.subject || item.snippet,
          received_at: item.received_at,
        },
        summary: `Unreplied email from ${contact?.name || item.from_address}: ${item.subject || item.snippet?.substring(0, 50)}`,
      });
    }
  }

  return candidates;
}





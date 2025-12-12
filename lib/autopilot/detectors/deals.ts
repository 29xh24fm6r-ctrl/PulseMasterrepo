// Deal Detector - Finds deals needing attention
// lib/autopilot/detectors/deals.ts

import { supabaseAdmin } from "@/lib/supabase";
import { AutopilotCandidate } from "../types";

/**
 * Detect deals needing attention
 */
export async function detectDealActions(
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

  // Find active/stalled deals
  const { data: deals } = await supabaseAdmin
    .from("deals")
    .select("id, name, value, status, stage, priority")
    .eq("user_id", dbUserId)
    .in("status", ["active", "stalled"])
    .limit(50);

  if (!deals || deals.length === 0) {
    return candidates;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const deal of deals) {
    // Check last communication
    const commDates: Date[] = [];

    // Email items
    const { data: emailItems } = await supabaseAdmin
      .from("email_items")
      .select("sent_at, received_at")
      .eq("deal_id", deal.id)
      .not("sent_at", "is", null)
      .or("received_at.not.is.null")
      .order("sent_at", { ascending: false, nullsLast: true })
      .order("received_at", { ascending: false, nullsLast: true })
      .limit(1);

    if (emailItems && emailItems.length > 0) {
      const date = emailItems[0].sent_at || emailItems[0].received_at;
      if (date) commDates.push(new Date(date));
    }

    // SMS messages
    const { data: smsMessages } = await supabaseAdmin
      .from("sms_messages")
      .select("sent_at, received_at")
      .eq("deal_id", deal.id)
      .not("sent_at", "is", null)
      .or("received_at.not.is.null")
      .order("sent_at", { ascending: false, nullsLast: true })
      .order("received_at", { ascending: false, nullsLast: true })
      .limit(1);

    if (smsMessages && smsMessages.length > 0) {
      const date = smsMessages[0].sent_at || smsMessages[0].received_at;
      if (date) commDates.push(new Date(date));
    }

    // Calls
    const { data: calls } = await supabaseAdmin
      .from("calls")
      .select("started_at")
      .eq("deal_id", deal.id)
      .not("started_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1);

    if (calls && calls.length > 0 && calls[0].started_at) {
      commDates.push(new Date(calls[0].started_at));
    }

    const latestComm = commDates.length > 0
      ? new Date(Math.max(...commDates.map(d => d.getTime())))
      : null;

    const daysSinceComm = latestComm
      ? Math.floor((Date.now() - latestComm.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Get momentum score
    const { data: intel } = await supabaseAdmin
      .from("deal_intelligence")
      .select("momentum_score")
      .eq("deal_id", deal.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Determine risk
    let riskLevel: "low" | "medium" | "high" = "low";
    if (
      deal.status === "stalled" ||
      (daysSinceComm !== null && daysSinceComm > 7) ||
      (intel?.momentum_score !== null && intel.momentum_score < 0.3)
    ) {
      riskLevel = "high";
    } else if (
      (daysSinceComm !== null && daysSinceComm > 3) ||
      (intel?.momentum_score !== null && intel.momentum_score < 0.5) ||
      (deal.value && deal.value > 50000)
    ) {
      riskLevel = "medium";
    }

    // Only add if high value or high risk
    if (riskLevel === "high" || (deal.value && deal.value > 10000)) {
      candidates.push({
        type: "deal_nudge",
        riskLevel,
        context: {
          deal_id: deal.id,
          deal_name: deal.name,
          value: deal.value,
          status: deal.status,
          days_since_comm: daysSinceComm,
          momentum_score: intel?.momentum_score || null,
        },
        summary: `Deal needs attention: ${deal.name} (${daysSinceComm !== null ? `${daysSinceComm} days` : "no"} since last touch)`,
      });
    }
  }

  return candidates;
}





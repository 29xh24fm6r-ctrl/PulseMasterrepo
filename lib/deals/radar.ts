// Deal Radar Engine
// lib/deals/radar.ts

import { supabaseAdmin } from "@/lib/supabase";
import { DealRadarItem } from "./types";

/**
 * Get deal radar items for a user - deals that need attention
 */
export async function getDealRadarForUser(
  userId: string,
  limit = 10
): Promise<DealRadarItem[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load active/stalled deals
  const { data: deals } = await supabaseAdmin
    .from("deals")
    .select("*")
    .eq("user_id", dbUserId)
    .in("status", ["active", "stalled"])
    .order("updated_at", { ascending: false });

  if (!deals || deals.length === 0) {
    return [];
  }

  // 2. For each deal, compute metrics
  const radarItems: DealRadarItem[] = await Promise.all(
    deals.map(async (deal) => {
      const dealId = deal.id;

      // Get latest communication date from all channels
      const commDates: Date[] = [];

      // Email items
      const { data: emailItems } = await supabaseAdmin
        .from("email_items")
        .select("sent_at, received_at")
        .eq("deal_id", dealId)
        .not("sent_at", "is", null)
        .or("received_at.not.is.null")
        .order("sent_at", { ascending: false, nullsLast: true })
        .order("received_at", { ascending: false, nullsLast: true })
        .limit(1);

      if (emailItems && emailItems.length > 0) {
        const item = emailItems[0];
        const date = item.sent_at || item.received_at;
        if (date) commDates.push(new Date(date));
      }

      // SMS messages
      const { data: smsMessages } = await supabaseAdmin
        .from("sms_messages")
        .select("sent_at, received_at")
        .eq("deal_id", dealId)
        .not("sent_at", "is", null)
        .or("received_at.not.is.null")
        .order("sent_at", { ascending: false, nullsLast: true })
        .order("received_at", { ascending: false, nullsLast: true })
        .limit(1);

      if (smsMessages && smsMessages.length > 0) {
        const msg = smsMessages[0];
        const date = msg.sent_at || msg.received_at;
        if (date) commDates.push(new Date(date));
      }

      // Calls
      const { data: calls } = await supabaseAdmin
        .from("calls")
        .select("started_at")
        .eq("deal_id", dealId)
        .not("started_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(1);

      if (calls && calls.length > 0 && calls[0].started_at) {
        commDates.push(new Date(calls[0].started_at));
      }

      // Calculate days since last communication
      const latestCommDate = commDates.length > 0 
        ? new Date(Math.max(...commDates.map(d => d.getTime())))
        : null;
      
      const daysSinceLastComm = latestCommDate
        ? Math.floor((Date.now() - latestCommDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Count open tasks
      const { count: openTasksCount } = await supabaseAdmin
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("deal_id", dealId)
        .in("status", ["open", "in_progress"]);

      // Get latest intelligence
      const { data: intel } = await supabaseAdmin
        .from("deal_intelligence")
        .select("risk_summary, momentum_score")
        .eq("deal_id", dealId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Compute risk label
      let riskLabel: "low" | "medium" | "high" = "low";
      
      if (
        deal.status === "stalled" ||
        (daysSinceLastComm !== null && daysSinceLastComm > 7) ||
        (intel?.momentum_score !== null && intel.momentum_score < 0.3)
      ) {
        riskLabel = "high";
      } else if (
        (daysSinceLastComm !== null && daysSinceLastComm > 3) ||
        (intel?.momentum_score !== null && intel.momentum_score < 0.5) ||
        (openTasksCount || 0) > 3
      ) {
        riskLabel = "medium";
      }

      return {
        dealId: deal.id,
        name: deal.name,
        value: deal.value || null,
        stage: deal.stage || null,
        status: deal.status || null,
        priority: deal.priority || null,
        daysSinceLastComm,
        openTasksCount: openTasksCount || 0,
        recentRiskSummary: intel?.risk_summary || null,
        momentumScore: intel?.momentum_score || null,
        riskLabel,
      };
    })
  );

  // 3. Sort by priority, risk, then value
  radarItems.sort((a, b) => {
    // Priority: critical > high > medium > low
    const priorityOrder: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    const aPriority = priorityOrder[a.priority || "low"] || 1;
    const bPriority = priorityOrder[b.priority || "low"] || 1;
    if (aPriority !== bPriority) return bPriority - aPriority;

    // Risk: high > medium > low
    const riskOrder: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    const aRisk = riskOrder[a.riskLabel] || 1;
    const bRisk = riskOrder[b.riskLabel] || 1;
    if (aRisk !== bRisk) return bRisk - aRisk;

    // Value: higher first
    const aValue = a.value || 0;
    const bValue = b.value || 0;
    return bValue - aValue;
  });

  // 4. Return top N
  return radarItems.slice(0, limit);
}





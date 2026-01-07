// Usage Alerts Service
import { supabaseAdmin } from "@/lib/supabase";
import { sendLowBalanceAlert, sendTokensDepletedEmail } from "./email";

const ALERT_THRESHOLDS = [80, 90, 100];

export async function checkUsageAlerts(userId: string, monthlyLimit: number, usedThisMonth: number, purchasedTokens: number): Promise<void> {
  const percentUsed = Math.round((usedThisMonth / monthlyLimit) * 100);
  const tokensRemaining = Math.max(0, monthlyLimit - usedThisMonth) + purchasedTokens;

  for (const threshold of ALERT_THRESHOLDS) {
    if (percentUsed >= threshold) {
      const alreadySent = await hasAlertBeenSent(userId, threshold);
      if (!alreadySent) {
        await markAlertSent(userId, threshold);
        await triggerAlert(userId, threshold, tokensRemaining, percentUsed);
        return;
      }
    }
  }
}

async function hasAlertBeenSent(userId: string, threshold: number): Promise<boolean> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin.from("usage_logs").select("*", { count: "exact", head: true }).eq("user_id_uuid", userId).eq("feature", `alert_${threshold}`).gte("created_at", startOfMonth.toISOString());
  return (count || 0) > 0;
}

async function markAlertSent(userId: string, threshold: number): Promise<void> {
  await supabaseAdmin.from("usage_logs").insert({ user_id_uuid: userId, owner_user_id_legacy: userId, feature: `alert_${threshold}`, tokens_used: 0, cost_cents: 0, model: "system", metadata: { type: "usage_alert", threshold } as any });
}

async function triggerAlert(userId: string, threshold: number, tokensRemaining: number, percentUsed: number): Promise<void> {
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("email").eq("user_id_uuid", userId).single();
  if (!profile?.email) { console.log("No email for user:", userId); return; }
  const name = profile.email.split("@")[0];
  if (threshold === 100) { await sendTokensDepletedEmail(profile.email, name); }
  else { await sendLowBalanceAlert(profile.email, name, tokensRemaining, percentUsed); }
  console.log(`📧 Sent ${threshold}% usage alert to ${profile.email}`);
}

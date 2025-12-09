import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_USERS = ["user_36NzFTiYlRlzKxEfTw2FXrnVJNe"];

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !ADMIN_USERS.includes(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { count: totalUsers } = await supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true });
    const { count: plusUsers } = await supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("plan", "plus");
    const { count: activeUsers } = await supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).gte("updated_at", startOfMonth.toISOString());

    const { data: usageLogs } = await supabaseAdmin.from("usage_logs").select("cost_cents, feature").gte("created_at", startOfMonth.toISOString()).not("feature", "like", "alert_%");

    const totalTokensUsed = usageLogs?.reduce((sum, log) => sum + (log.cost_cents || 0), 0) || 0;
    const featureUsage: Record<string, number> = {};
    usageLogs?.forEach((log) => { featureUsage[log.feature] = (featureUsage[log.feature] || 0) + 1; });

    const { data: topUsers } = await supabaseAdmin.from("user_profiles").select("user_id, email, plan, usage_cents_this_month").order("usage_cents_this_month", { ascending: false }).limit(10);
    const { data: recentSignups } = await supabaseAdmin.from("user_profiles").select("user_id, email, plan, created_at").order("created_at", { ascending: false }).limit(10);
    const { count: totalReferrals } = await supabaseAdmin.from("referral_rewards").select("*", { count: "exact", head: true });
    const { count: creditedReferrals } = await supabaseAdmin.from("referral_rewards").select("*", { count: "exact", head: true }).eq("status", "credited");

    return NextResponse.json({
      success: true,
      stats: {
        users: { total: totalUsers || 0, plus: plusUsers || 0, free: (totalUsers || 0) - (plusUsers || 0), active: activeUsers || 0, conversionRate: totalUsers ? ((plusUsers || 0) / totalUsers * 100).toFixed(1) + "%" : "0%" },
        revenue: { mrr: (plusUsers || 0) * 5, arr: (plusUsers || 0) * 60 },
        usage: { totalTokensUsed, totalAICalls: usageLogs?.length || 0, estimatedCost: (totalTokensUsed / 100).toFixed(2), avgTokensPerUser: totalUsers ? Math.round(totalTokensUsed / totalUsers) : 0 },
        featureUsage,
        topUsers: topUsers?.map((u) => ({ oderId: u.user_id.slice(-8), email: u.email || "N/A", plan: u.plan, tokensUsed: u.usage_cents_this_month || 0 })),
        recentSignups: recentSignups?.map((u) => ({ oderId: u.user_id.slice(-8), email: u.email || "N/A", plan: u.plan, date: u.created_at })),
        referrals: { total: totalReferrals || 0, credited: creditedReferrals || 0, pending: (totalReferrals || 0) - (creditedReferrals || 0) },
      },
    });
  } catch (err: any) { console.error("Admin stats error:", err); return NextResponse.json({ error: err.message }, { status: 500 }); }
}

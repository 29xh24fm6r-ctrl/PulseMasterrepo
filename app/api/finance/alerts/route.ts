// Finance Alerts API
// app/api/finance/alerts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserFinanceAlerts } from "@/lib/finance/insights";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");
    const includeDismissed = searchParams.get("includeDismissed") === "true";

    const alerts = await getUserFinanceAlerts(userId, { limit, includeDismissed });
    return NextResponse.json({ alerts });
  } catch (err: any) {
    console.error("[FinanceAlerts] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get alerts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const body = await req.json();
    const { alertId, action } = body; // 'seen' or 'dismiss'

    if (!alertId || !action) {
      return NextResponse.json({ error: "alertId and action required" }, { status: 400 });
    }

    const updateData: any = {};
    if (action === "seen") {
      updateData.seen_at = new Date().toISOString();
    } else if (action === "dismiss") {
      updateData.dismissed_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("finance_alerts")
      .update(updateData)
      .eq("id", alertId)
      .eq("user_id", dbUserId);

    if (error) {
      throw new Error(`Failed to update alert: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[FinanceAlerts] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update alert" },
      { status: 500 }
    );
  }
}





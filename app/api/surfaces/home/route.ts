// Home Surface API
// GET /api/surfaces/home
// app/api/surfaces/home/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDashboardData } from "@/lib/dashboard/aggregator";
import type { HomeSurfacePayload } from "@/lib/surfaces/types";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const d = await getDashboardData(userId);

    const payload: HomeSurfacePayload = {
      state: {
        sentence:
          (d.stats.todayEvents || d.stats.pendingActions || d.stats.unreadEmails)
            ? `State: ${d.stats.todayEvents} events • ${d.stats.pendingActions} actions • ${d.stats.unreadEmails} unread threads.`
            : "State: Clear runway. Nothing urgent detected.",
        chips: [
          { label: "Focus", value: d.todayFocus || "Keep it simple: do the highest leverage move first." },
          { label: "Risk", value: d.urgentItems?.[0]?.title || "No immediate risks detected." },
          { label: "Opportunity", value: d.relationshipAlerts?.[0]?.name ? `Touch ${d.relationshipAlerts[0].name}.` : "Quick win available." },
        ],
      },
      leverage: (d.urgentItems || []).slice(0, 7).map((u) => ({
        id: u.id,
        type: (u.type === "email" ? "inbox" : u.type) as any,
        title: u.title,
        why: u.description,
        severity: u.priority === "urgent" ? 90 : 70,
        href: u.url,
        primaryAction: { label: "Handle", href: u.url },
      })),
      signals: [
        { domain: "Time", metric: `${d.stats.todayEvents} today`, insight: d.todaySchedule?.[0]?.title ? `Next: ${d.todaySchedule[0].title}` : "No events detected.", cta: { label: "Open Time", href: "/time" } },
        { domain: "Work", metric: `${d.stats.pendingActions} actions`, insight: d.urgentItems?.[0]?.title || "No high-priority work surfaced.", cta: { label: "Open Work", href: "/workspace" } },
        { domain: "People", metric: `${d.stats.activeRelationships} active`, insight: d.relationshipAlerts?.[0]?.reason || "No relationship alerts.", cta: { label: "Open People", href: "/people" } },
        { domain: "Money", metric: "—", insight: "Finance surface not yet wired.", cta: { label: "Open Finance", href: "/finance" } },
        { domain: "Mind", metric: "—", insight: "Mind surface not yet wired.", cta: { label: "Open Mind", href: "/emotions" } },
        { domain: "Memory", metric: `${d.recentInsights?.length || 0} insights`, insight: d.recentInsights?.[0]?.content || "No recent insights.", cta: { label: "Open Brain", href: "/brain" } },
      ],
      flash: null,
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[surfaces/home] error", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

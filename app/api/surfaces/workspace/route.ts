// Workspace Surface API
// GET /api/surfaces/workspace
// app/api/surfaces/workspace/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDashboardData } from "@/lib/dashboard/aggregator";
import type { WorkspaceSurfacePayload, SurfaceMode } from "@/lib/surfaces/types";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "now") as SurfaceMode;

    const d = await getDashboardData(userId);

    // Minimal "reality stream": urgent items + next event.
    const stream = [
      ...(d.todaySchedule?.[0]
        ? [{
            id: `event:${d.todaySchedule[0].id}`,
            type: "meeting" as const,
            title: d.todaySchedule[0].title,
            delta: "Approaching",
            why: "Prep packet recommended.",
            severity: 75,
            href: "/time",
            actions: [{ label: "Prep", href: "/time" }],
          }]
        : []),
      ...(d.urgentItems || []).slice(0, 10).map((u) => ({
        id: u.id,
        type: (u.type === "email" ? "email" : (u.type as any)),
        title: u.title,
        delta: u.priority === "urgent" ? "Escalated" : "Active",
        why: u.description,
        severity: u.priority === "urgent" ? 90 : 70,
        href: u.url,
        actions: [{ label: "Handle", href: u.url }],
      })),
    ];

    const payload: WorkspaceSurfacePayload = {
      mode,
      stream,
      selected: {
        summary: "Select any card to see context, memory, intel, and the next best action.",
        coach: { name: "Pulse", note: "I'll speak only when it reduces error or increases leverage.", confidence: 0.9 },
      },
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[surfaces/workspace] error", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

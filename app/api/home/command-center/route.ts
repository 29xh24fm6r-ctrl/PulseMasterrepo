import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Command Center aggregation endpoint.
 * V1: deterministic + fast. Designed to be replaced piece-by-piece with real tasks/comms/deals.
 */
export async function GET() {
  try {
    const userId = await requireUserId();
    const sb = supabaseAdmin;

    // Keep existing deterministic response for now
    // TODO: Replace with real aggregation when ready
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning." : hour < 17 ? "Good afternoon." : "Good evening.";

    const brief = {
      greeting,
      timeWindowLabel: "Next 60 minutes",
      dayIntent: "Protect focus. Create momentum.",
      leverageState: "clear" as const,
      confidence: 76,
      nextMoveTitle: "Triage the top 5 comms, then complete one Focus item before lunch.",
      nextMoveReason:
        "When comms are tamed first, deep work becomes reliable and your day stops fragmenting.",
      evidence: ["Inbox backlog exists", "2 items due soon", "1 overdue risk", "Calls page has pending items"],
    };

    const work = [
      {
        id: "w-1",
        title: "Reply to the two highest-stakes threads",
        why: "Unblocks other people and prevents schedule slip.",
        etaMinutes: 15,
        status: "now" as const,
        href: "/calls",
        evidence: ["Reply pending", "Time-sensitive"],
      },
      {
        id: "w-2",
        title: "Lock a 25-minute Focus Block: ship one deliverable",
        why: "Your leverage comes from shipping, not sorting.",
        etaMinutes: 25,
        status: "focus" as const,
        href: "/focus-lock",
        evidence: ["Clear runway detected", "High leverage"],
      },
      {
        id: "w-3",
        title: "Follow up on the one deal that can move today",
        why: "Creates forward motion and prevents silent stall.",
        etaMinutes: 12,
        status: "soon" as const,
        href: "/deals",
        evidence: ["Deal momentum", "No touch recorded"],
      },
      {
        id: "w-4",
        title: "Rescue the overdue item",
        why: "Overdue items quietly tax attention until resolved.",
        etaMinutes: 10,
        status: "blocked" as const,
        href: "/tasks",
        evidence: ["Overdue"],
      },
    ];

    const triage = [
      {
        id: "t-1",
        kind: "email" as const,
        from: "Client A",
        subject: "Need quick confirmation",
        preview: "Can you confirm the timing on the deliverable?",
        urgency: "soon" as const,
        suggestedAction: "Reply with a 2-sentence confirmation + next step.",
        evidence: ["Reply pending", "Impacts schedule"],
        href: "/calls",
      },
      {
        id: "t-2",
        kind: "voicemail" as const,
        from: "Unknown Caller",
        subject: "Voicemail: call back requested",
        preview: "Left a message with callback number.",
        urgency: "now" as const,
        suggestedAction: "Call back or send SMS acknowledgment.",
        evidence: ["Voicemail", "Time-sensitive"],
        href: "/calls",
      },
    ];

    const score = {
      momentumScore: 84,
      completedToday: 3,
      dueSoon: 5,
      overdue: 1,
      commsBacklog: 12,
    };

    return NextResponse.json({ ok: true, brief, work, triage, score });
  } catch (e: any) {
    const msg = e?.message ?? "Unauthorized";
    const status = msg === "Unauthorized" ? 401 : 500;

    return NextResponse.json(
      {
        ok: false,
        error: msg,
        hint:
          status === 401
            ? "Sign in via Clerk OR set PULSE_DEV_USER_ID in .env.local for local smoke tests."
            : undefined,
      },
      { status }
    );
  }
}

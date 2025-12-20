// Home Surface API
// GET /api/surfaces/home
// app/api/surfaces/home/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDashboardData } from "@/lib/dashboard/aggregator";
import type {
  HomeSurfacePayload,
  StreamCard,
  NextBestAction,
  LeverageItem,
  MomentumPayload,
  WisdomHighlight,
} from "@/lib/surfaces/types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function truncate(s: string, n: number) {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).trimEnd() + "…";
}

function buildActivity(d: any): StreamCard[] {
  const cards: StreamCard[] = [];

  const insights = Array.isArray(d?.recentInsights) ? d.recentInsights : [];
  if (insights[0]?.content) {
    cards.push({
      id: insights[0].id || `recall_${Math.random().toString(36).slice(2)}`,
      type: "loop",
      title: "Memory recall",
      delta: "Recall",
      why: String(insights[0].content).slice(0, 160),
      severity: 52,
      href: "/brain",
      actions: [{ label: "Open Brain", href: "/brain" }],
      proof: { shownBecause: ["A recent insight was detected and surfaced as a recall cue."] },
    });
  }

  const sched = Array.isArray(d?.todaySchedule) ? d.todaySchedule : [];
  for (const ev of sched.slice(0, 2)) {
    cards.push({
      id: ev.id || `event_${Math.random().toString(36).slice(2)}`,
      type: "meeting",
      title: ev.title || "Upcoming event",
      delta: "Upcoming",
      why: ev.start ? `Starts ${ev.start}` : "On your calendar",
      severity: 55,
      href: "/time",
      actions: [{ label: "Open Time", href: "/time" }],
      proof: { shownBecause: ["Upcoming events shape your available focus blocks."] },
    });
  }

  const urgent = Array.isArray(d?.urgentItems) ? d.urgentItems : [];
  for (const u of urgent.slice(0, 3)) {
    cards.push({
      id: u.id || `urgent_${Math.random().toString(36).slice(2)}`,
      type: u.type === "email" ? "email" : u.type === "deal" ? "deal" : "task",
      title: u.title || "High leverage item",
      delta: u.priority === "urgent" ? "Urgent" : "High priority",
      why: u.description || "Needs attention",
      severity: u.priority === "urgent" ? 85 : 70,
      href: u.url,
      actions: u.url ? [{ label: "Open", href: u.url }] : undefined,
      proof: { shownBecause: ["Detected as urgent/high priority by your dashboard aggregator."] },
    });
  }

  cards.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  return cards.slice(0, 8);
}

function computeMomentum(args: {
  stats: { todayEvents: number; pendingActions: number; unreadEmails: number; activeRelationships: number };
  leverage: LeverageItem[];
  activity: StreamCard[];
}): MomentumPayload {
  const { stats, leverage } = args;

  const leverageCount = leverage.length;
  const highSeverity = leverage.filter((x) => (x.severity ?? 0) >= 85).length;

  const pressure =
    clamp(stats.pendingActions * 6, 0, 45) +
    clamp(stats.unreadEmails * 2, 0, 20) +
    clamp(stats.todayEvents * 3, 0, 18) +
    clamp(highSeverity * 6, 0, 18);

  const relief =
    (leverageCount === 0 ? 18 : leverageCount <= 3 ? 10 : 0) +
    (stats.unreadEmails === 0 ? 6 : 0);

  const raw = 82 - pressure + relief;
  const score = clamp(Math.round(raw), 0, 100);

  const trend: "UP" | "FLAT" | "DOWN" =
    score >= 75 ? "UP" : score <= 45 ? "DOWN" : "FLAT";

  const headline =
    trend === "UP" ? "Momentum rising" : trend === "DOWN" ? "Momentum slipping" : "Momentum stable";

  const insight =
    trend === "UP"
      ? "Keep the stack small. One decisive action keeps the flywheel turning."
      : trend === "DOWN"
      ? "Backlog is stealing focus. Reduce open loops to regain control."
      : "You're holding steady. A single high-leverage completion will push you up.";

  const cta =
    trend === "DOWN"
      ? { label: "Clear one loop", href: "/workspace" }
      : { label: "Protect focus", href: "/time" };

  return {
    score,
    trend,
    headline,
    insight,
    cta,
    proof: {
      shownBecause: [
        `Pending actions: ${stats.pendingActions}`,
        `Unread threads: ${stats.unreadEmails}`,
        `Today's events: ${stats.todayEvents}`,
        `High-severity leverage: ${highSeverity}`,
      ],
    },
  };
}

function pickDoAvoidText(obj: any): { doText?: string; avoidText?: string } {
  const doText =
    (obj?.recommendation?.text as string) ||
    (obj?.recommendation?.summary as string) ||
    (Array.isArray(obj?.recommendation?.steps) ? obj.recommendation.steps.join(" • ") : undefined);

  const avoidText =
    (obj?.avoid?.text as string) ||
    (obj?.avoid?.summary as string) ||
    (Array.isArray(obj?.avoid?.patterns) ? obj.avoid.patterns.join(" • ") : undefined);

  return { doText, avoidText };
}

async function getWisdomHighlightForUser(clerkUserId: string): Promise<WisdomHighlight | null> {
  let dbUserId = clerkUserId;

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const sb = supabaseAdmin;

    const { data: userRow } = await sb
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();

    if (userRow?.id) dbUserId = userRow.id;

    const { data: lessons } = await sb
      .from("wisdom_lessons")
      .select("id,title,summary,domain,strength,usefulness,recommendation,avoid,evidence,status,scope,updated_at")
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .order("usefulness", { ascending: false })
      .order("strength", { ascending: false })
      .limit(8);

    if (!lessons || lessons.length === 0) return null;

    const best = lessons
      .slice()
      .sort(
        (a: any, b: any) =>
          (b.usefulness ?? 0.5) * (b.strength ?? 0.5) - (a.usefulness ?? 0.5) * (a.strength ?? 0.5)
      )[0];

    const { doText, avoidText } = pickDoAvoidText(best);

    const evidenceCount =
      best?.evidence && typeof best.evidence === "object"
        ? Array.isArray((best.evidence as any)?.events)
          ? (best.evidence as any).events.length
          : undefined
        : undefined;

    return {
      id: String(best.id),
      title: best.title as string,
      summary: (best.summary as string) ?? null,
      domain: (best.domain as string) ?? null,
      strength: best.strength ?? 0.5,
      usefulness: best.usefulness ?? 0.5,
      doText,
      avoidText,
      proof: {
        shownBecause: [
          `Highest-fit lesson right now (usefulness ${(best.usefulness ?? 0.5).toFixed(2)}, strength ${(best.strength ?? 0.5).toFixed(2)}).`,
          evidenceCount != null ? `Backed by ${evidenceCount} experience events.` : "Backed by your experience history.",
        ],
      },
    };
  } catch {
    return null;
  }
}

function wisdomDrivenNext(args: {
  leverage: LeverageItem[];
  stats: any;
  momentum: MomentumPayload;
  wisdom: WisdomHighlight | null;
}): NextBestAction {
  const { leverage, stats, momentum, wisdom } = args;

  const top = leverage?.[0];
  const topHref = top?.primaryAction?.href || top?.href;

  const baseline: NextBestAction = top
    ? {
        title: "Next Action",
        label: top.primaryAction?.label || "Do it now",
        href: topHref,
        action: top.primaryAction?.action,
        why: top.why || "Highest leverage move detected.",
        confidence: clamp(top.severity ?? 70, 0, 100),
        proof: {
          shownBecause: [
            "This item ranked highest by leverage and urgency.",
            stats?.unreadEmails ? `You have ${stats.unreadEmails} unread threads impacting attention.` : "Inbox load is stable.",
          ].filter(Boolean),
        },
      }
    : {
        title: "Next Action",
        label: "Open Workspace",
        href: "/workspace",
        why: "Clear runway. Choose one meaningful move to create momentum.",
        confidence: 55,
        proof: {
          shownBecause: [
            "No urgent items were detected.",
            "The fastest way to build momentum is to choose one deliberate action.",
          ],
        },
      };

  if (!wisdom) return baseline;

  const fit = Math.round(((wisdom.usefulness ?? 0.5) * (wisdom.strength ?? 0.5)) * 100);
  const doText = wisdom.doText?.trim();
  const avoidText = wisdom.avoidText?.trim();

  if (momentum.trend === "DOWN") {
    if (top && topHref) {
      return {
        title: "Next Action",
        label: "Close one loop",
        href: topHref,
        why: doText ? `Apply your playbook: ${doText}` : "Momentum is slipping. Closing one loop restores control fast.",
        confidence: clamp((top.severity ?? 70) + 5, 0, 100),
        proof: {
          shownBecause: [
            `Wisdom: "${wisdom.title}" (fit ${fit}%).`,
            "Momentum is DOWN → prioritize loop closure.",
            ...(doText ? [`Do: ${doText}`] : []),
            ...(avoidText ? [`Avoid: ${avoidText}`] : []),
          ],
        },
      };
    }

    return {
      title: "Next Action",
      label: "Clear one loop",
      href: "/workspace",
      why: doText ? `Apply your playbook: ${doText}` : "Momentum is slipping. Clearing one loop restores control fast.",
      confidence: 70,
      proof: {
        shownBecause: [
          `Wisdom: "${wisdom.title}" (fit ${fit}%).`,
          "Momentum is DOWN → prioritize loop closure.",
          ...(doText ? [`Do: ${doText}`] : []),
          ...(avoidText ? [`Avoid: ${avoidText}`] : []),
        ],
      },
    };
  }

  if (top && topHref) {
    return {
      title: "Next Action",
      label: "Apply your playbook",
      href: topHref,
      why: doText ? doText : baseline.why || "Highest leverage move detected.",
      confidence: clamp((baseline.confidence ?? 60) + 5, 0, 100),
      proof: {
        shownBecause: [
          `Wisdom: "${wisdom.title}" (fit ${fit}%).`,
          ...(doText ? [`Do: ${doText}`] : []),
          ...(avoidText ? [`Avoid: ${avoidText}`] : []),
          "Routed to the highest-leverage actionable item right now.",
        ],
      },
    };
  }

  return {
    title: "Next Action",
    label: "Apply your playbook",
    href: "/workspace",
    why: doText ? doText : "Use your playbook to choose one meaningful move.",
    confidence: 62,
    proof: {
      shownBecause: [
        `Wisdom: "${wisdom.title}" (fit ${fit}%).`,
        ...(doText ? [`Do: ${doText}`] : []),
        ...(avoidText ? [`Avoid: ${avoidText}`] : []),
        "No ranked leverage items detected → open workspace to select the best move.",
      ],
    },
  };
}

/**
 * ✅ Focus / Risk / Opportunity chip builder
 * - Focus: Wisdom title (and a short Do snippet if available)
 * - Risk: top leverage item OR Wisdom Avoid
 * - Opportunity: relationship alert OR Wisdom Do OR "Quick win"
 */
function buildChips(args: { d: any; leverage: LeverageItem[]; wisdom: WisdomHighlight | null }) {
  const { d, leverage, wisdom } = args;

  const doText = wisdom?.doText ? truncate(wisdom.doText, 64) : null;
  const avoidText = wisdom?.avoidText ? truncate(wisdom.avoidText, 64) : null;

  const focus =
    wisdom?.title
      ? `Playbook: ${truncate(wisdom.title, 48)}${doText ? ` — ${doText}` : ""}`
      : d?.todayFocus || "Keep it simple: do the highest leverage move first.";

  const risk =
    leverage?.[0]?.title
      ? truncate(leverage[0].title, 72)
      : avoidText
      ? `Avoid: ${avoidText}`
      : "No immediate risks detected.";

  const opportunity =
    d?.relationshipAlerts?.[0]?.name
      ? `Touch ${d.relationshipAlerts[0].name}.`
      : doText
      ? `Do: ${doText}`
      : "Quick win available.";

  return [
    { label: "Focus" as const, value: focus },
    { label: "Risk" as const, value: risk },
    { label: "Opportunity" as const, value: opportunity },
  ];
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const d = await getDashboardData(userId);

    const stats = d?.stats || {
      todayEvents: 0,
      pendingActions: 0,
      unreadEmails: 0,
      activeRelationships: 0,
    };

    const leverage = (d?.urgentItems || []).slice(0, 7).map((u: any) => ({
      id: u.id,
      type: (u.type === "email" ? "inbox" : u.type) as any,
      title: u.title,
      why: u.description,
      severity: u.priority === "urgent" ? 90 : 70,
      href: u.url,
      primaryAction: { label: "Handle", href: u.url },
      proof: {
        shownBecause: [
          u.priority === "urgent" ? "Marked urgent by the system." : "Marked high priority by the system.",
          u.type ? `Classified as: ${u.type}.` : "Classified for action.",
        ],
      },
    })) as LeverageItem[];

    const activity = buildActivity(d);
    const momentum = computeMomentum({ stats, leverage, activity });
    const wisdom = await getWisdomHighlightForUser(userId);

    const chips = buildChips({ d, leverage, wisdom });

    const payload: HomeSurfacePayload = {
      state: {
        sentence:
          stats.todayEvents || stats.pendingActions || stats.unreadEmails
            ? `State: ${stats.todayEvents} events • ${stats.pendingActions} actions • ${stats.unreadEmails} unread threads.`
            : "State: Clear runway. Nothing urgent detected.",
        chips,
      },
      leverage,
      next: wisdomDrivenNext({ leverage, stats, momentum, wisdom }),
      momentum,
      wisdom,
      signals: [
        {
          domain: "Time",
          metric: `${stats.todayEvents} today`,
          insight: d?.todaySchedule?.[0]?.title ? `Next: ${d.todaySchedule[0].title}` : "No events detected.",
          cta: { label: "Open Time", href: "/time" },
          proof: { shownBecause: ["Time signals help protect focus and prevent overcommitment."] },
        },
        {
          domain: "Work",
          metric: `${stats.pendingActions} actions`,
          insight: d?.urgentItems?.[0]?.title || "No high-priority work surfaced.",
          cta: { label: "Open Work", href: "/workspace" },
          proof: { shownBecause: ["Work signals highlight open loops and commitments."] },
        },
        {
          domain: "People",
          metric: `${stats.activeRelationships} active`,
          insight: d?.relationshipAlerts?.[0]?.reason || "No relationship alerts.",
          cta: { label: "Open People", href: "/people" },
          proof: { shownBecause: ["Relationships compound. Pulse surfaces drift early."] },
        },
        { domain: "Money", metric: "—", insight: "Finance surface not yet wired.", cta: { label: "Open Finance", href: "/finance" } },
        { domain: "Mind", metric: "—", insight: "Mind surface not yet wired.", cta: { label: "Open Mind", href: "/emotions" } },
        {
          domain: "Memory",
          metric: `${d?.recentInsights?.length || 0} insights`,
          insight: d?.recentInsights?.[0]?.content || "No recent insights.",
          cta: { label: "Open Brain", href: "/brain" },
          proof: { shownBecause: ["Memory signals keep lessons and insights accessible."] },
        },
      ],
      activity,
      flash: null,
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[surfaces/home] error", e);

    const safePayload: HomeSurfacePayload = {
      state: {
        sentence: "State: Calibrating your dashboard…",
        chips: [
          { label: "Focus", value: "Keep it simple: do the highest leverage move first." },
          { label: "Risk", value: "No immediate risks detected." },
          { label: "Opportunity", value: "Quick win available." },
        ],
      },
      leverage: [],
      next: {
        title: "Next Action",
        label: "Open Workspace",
        href: "/workspace",
        why: "Pulse is calibrating. Start with your highest leverage work surface.",
        confidence: 40,
        proof: { shownBecause: ["A safe default is provided if the surface fails to load."] },
      },
      momentum: {
        score: 50,
        trend: "FLAT",
        headline: "Momentum stable",
        insight: "Pulse is calibrating. Take one small action to create traction.",
        cta: { label: "Open Workspace", href: "/workspace" },
        proof: { shownBecause: ["Fallback momentum provided when surface fails."] },
      },
      wisdom: null,
      signals: [
        { domain: "Time", metric: "—", insight: "Loading…", cta: { label: "Open Time", href: "/time" } },
        { domain: "Work", metric: "—", insight: "Loading…", cta: { label: "Open Work", href: "/workspace" } },
        { domain: "People", metric: "—", insight: "Loading…", cta: { label: "Open People", href: "/people" } },
        { domain: "Money", metric: "—", insight: "Finance surface not yet wired.", cta: { label: "Open Finance", href: "/finance" } },
        { domain: "Mind", metric: "—", insight: "Mind surface not yet wired.", cta: { label: "Open Mind", href: "/emotions" } },
        { domain: "Memory", metric: "—", insight: "Loading…", cta: { label: "Open Brain", href: "/brain" } },
      ],
      activity: [],
      flash: null,
    };

    return NextResponse.json(safePayload, { status: 200 });
  }
}

// tools/design_propose_screen.ts
// Design intelligence: propose a UI screen as an approval-gated artifact.
// No rendering, no React, no file writes. Pure structured design proposal.
// Phase A+: Screen modes, self-explaining screens, designed absence,
//           temporal context, conversational presentation.
// Canon: never throw, return structured status, no retries.

import crypto from "node:crypto";
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { buildContext, shape } from "../personhood/index.js";

// ============================================
// INPUT SCHEMA
// ============================================

const constraintsSchema = z
  .object({
    platform: z.enum(["web", "mobile", "universal"]).optional(),
    tone: z.enum(["calm", "focused", "executive", "playful"]).optional(),
    density: z.enum(["low", "medium", "high"]).optional(),
  })
  .optional();

const inputSchema = z.object({
  target_user_id: z.string().min(10),
  request: z.string().min(1),
  context_hint: z.string().optional(),
  constraints: constraintsSchema,
});

// ============================================
// TYPES
// ============================================

type ScreenMode = "scan" | "investigate" | "act";

interface ScreenComponent {
  name: string;
  priority: "primary" | "secondary" | "tertiary";
  props?: string[];
  when?: string;
  message?: string;
  data_source?: string;
  empty_state?: string;
  loading_state?: string;
  error_state?: string;
  interactions?: string[];
  accessibility_note?: string;
}

interface DesignProposal {
  screen_name: string;
  intent: string;
  rationale: {
    why_this_layout: string;
    why_these_components: string;
    user_context_considered: string[];
    alternatives_rejected?: Array<{ option: string; reason: string }>;
  };
  placement: {
    app_section: string;
    navigation_level: "primary" | "secondary";
    icon?: string;
  };
  navigation: {
    parent_screen?: string;
    child_screens?: string[];
    related_screens?: string[];
    back_behavior: "stack" | "replace" | "modal_dismiss";
  };
  layout: {
    type: string;
    columns?: { desktop?: number; tablet?: number; mobile?: number };
  };
  components: ScreenComponent[];
  interaction_model: {
    primary_action: string;
    secondary_action?: string;
  };
  tone_guidelines: string[];
  screen_modes: {
    available: ScreenMode[];
    default: ScreenMode;
    mode_rationale: Partial<Record<ScreenMode, string>>;
  };
  explanation: {
    why_this_screen_exists: string;
    why_now: string;
    what_changed_since_last_time?: string;
  };
  temporal_context: {
    now: string;
    since_last_view?: string;
  };
  data_sources?: Array<{
    component_name: string;
    binds_to: string;
    query_hint?: string;
  }>;
  variants?: Array<{
    variant_name: string;
    description: string;
    differs_in: string[];
    recommended_for: string;
  }>;
  surface_suggestion?: {
    recommended: "desktop" | "mobile" | "voice";
    reason: string;
  };
  future_extensions?: string[];
  on_approval?: {
    create_implementation_task?: boolean;
    notify_cursor?: boolean;
    add_to_design_backlog?: boolean;
    generate_figma_spec?: boolean;
  };
}

interface AbsenceProposal {
  proposal_type: "ui_absence";
  reason: "no_active_signals" | "user_in_flow" | "nothing_actionable";
  message: string;
  next_check_in?: string;
}

// ============================================
// CONTEXT GATHERING
// ============================================

interface SystemContext {
  trust: { autonomy_level: number; trust_score: number };
  signal_count: number;
  signal_types: string[];
  signal_max_severity: string;
  trigger_count: number;
  trigger_messages: string[];
  memory_count: number;
  memory_themes: string[];
  decision_count: number;
  last_design_view_at: string | null;
  last_design_signal_count: number | null;
}

async function safeQuery<T>(
  fn: () => PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
): Promise<T> {
  try {
    const { data } = await fn();
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

async function gatherContext(userId: string): Promise<SystemContext> {
  const sb = getSupabase();

  const [signals, triggers, memories, decisions, trust, lastView] =
    await Promise.all([
      safeQuery(
        () =>
          sb
            .from("pulse_signals")
            .select("signal_type, payload, metadata")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
        [] as any[],
      ),
      safeQuery(
        () =>
          sb
            .from("pulse_trigger_candidates")
            .select("trigger_type, message")
            .eq("user_id", userId)
            .eq("status", "pending")
            .order("detected_at", { ascending: false })
            .limit(10),
        [] as any[],
      ),
      safeQuery(
        () =>
          sb
            .from("pulse_memory_events")
            .select("memory_type, content")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
        [] as any[],
      ),
      safeQuery(
        () =>
          sb
            .from("pulse_decisions")
            .select("id")
            .eq("user_id", userId)
            .limit(1),
        [] as any[],
      ),
      safeQuery(
        () =>
          sb
            .from("pulse_trust_state")
            .select("autonomy_level, trust_score")
            .eq("user_id", userId)
            .maybeSingle(),
        null as any,
      ),
      // Fetch last design_proposal_presented event for temporal context
      safeQuery(
        () =>
          sb
            .from("pulse_observer_events")
            .select("payload, created_at")
            .eq("user_id", userId)
            .eq("event_type", "design_proposal_presented")
            .order("created_at", { ascending: false })
            .limit(1),
        [] as any[],
      ),
    ]);

  const signalTypes: string[] = [
    ...new Set(signals.map((s: any) => String(s.signal_type ?? ""))),
  ];
  const triggerMessages: string[] = triggers.map((t: any) =>
    String(t.message ?? ""),
  );
  const memoryThemes: string[] = [
    ...new Set(memories.map((m: any) => String(m.memory_type ?? ""))),
  ];

  // Determine max signal severity from metadata
  const severities = ["none", "low", "medium", "high", "critical"];
  let maxSeverityIdx = 0;
  for (const s of signals) {
    const meta = s.metadata as Record<string, unknown> | null;
    const sev = (meta?.severity as string) ?? "none";
    const idx = severities.indexOf(sev);
    if (idx > maxSeverityIdx) maxSeverityIdx = idx;
  }

  // Extract last view info
  const lastViewEvent = lastView?.[0] ?? null;
  const lastViewPayload = lastViewEvent?.payload as Record<
    string,
    unknown
  > | null;

  return {
    trust: {
      autonomy_level: trust?.autonomy_level ?? 0,
      trust_score: trust?.trust_score ?? 0.5,
    },
    signal_count: signals.length,
    signal_types: signalTypes,
    signal_max_severity: severities[maxSeverityIdx],
    trigger_count: triggers.length,
    trigger_messages: triggerMessages,
    memory_count: memories.length,
    memory_themes: memoryThemes,
    decision_count: decisions.length,
    last_design_view_at: lastViewEvent?.created_at ?? null,
    last_design_signal_count:
      (lastViewPayload?.signal_count as number) ?? null,
  };
}

// ============================================
// REQUEST CLASSIFICATION
// ============================================

type ScreenIntent =
  | "monitoring"
  | "task_mgmt"
  | "decisions"
  | "timeline"
  | "overview"
  | "intelligence"
  | "settings";

const INTENT_KEYWORDS: Record<ScreenIntent, string[]> = {
  monitoring: [
    "worry", "worries", "worried", "concern", "concerns", "risk", "risks",
    "alert", "alerts", "watch", "monitor", "health", "status",
  ],
  task_mgmt: [
    "task", "tasks", "todo", "to-do", "work", "action", "actions",
    "backlog", "queue", "assign",
  ],
  decisions: [
    "decision", "decisions", "choose", "choice", "choices", "option",
    "options", "decide", "evaluate", "compare",
  ],
  timeline: [
    "history", "log", "timeline", "past", "audit", "trail", "activity",
    "what happened",
  ],
  overview: [
    "dashboard", "summary", "overview", "home", "main", "pulse",
    "everything", "state",
  ],
  intelligence: [
    "insight", "insights", "pattern", "patterns", "prediction",
    "predictions", "trend", "trends", "learn", "learned",
  ],
  settings: [
    "setting", "settings", "config", "configure", "preference",
    "preferences", "trust", "autonomy",
  ],
};

function classifyRequest(request: string): ScreenIntent {
  const lower = request.toLowerCase();
  let bestIntent: ScreenIntent = "overview";
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as ScreenIntent;
    }
  }

  return bestIntent;
}

// ============================================
// SCREEN NAME GENERATION
// ============================================

const INTENT_SCREEN_NAMES: Record<ScreenIntent, string> = {
  monitoring: "pulse_concerns_dashboard",
  task_mgmt: "pulse_task_board",
  decisions: "pulse_decision_center",
  timeline: "pulse_activity_timeline",
  overview: "pulse_command_center",
  intelligence: "pulse_insight_feed",
  settings: "pulse_trust_settings",
};

const INTENT_ICONS: Record<ScreenIntent, string> = {
  monitoring: "shield-alert",
  task_mgmt: "check-square",
  decisions: "git-branch",
  timeline: "clock",
  overview: "layout-dashboard",
  intelligence: "brain",
  settings: "sliders",
};

// ============================================
// SCREEN INTENT MODES (Phase A+, Feature 1)
// ============================================

function selectScreenMode(ctx: SystemContext): {
  available: ScreenMode[];
  default: ScreenMode;
  mode_rationale: Partial<Record<ScreenMode, string>>;
} {
  const hour = new Date().getHours();
  const isMorning = hour >= 6 && hour < 12;
  const isEvening = hour >= 18;
  const highUrgency =
    ctx.signal_max_severity === "high" ||
    ctx.signal_max_severity === "critical";
  const hasActionables = ctx.trigger_count > 0;
  const denseSignals = ctx.signal_count > 5;

  const rationale: Partial<Record<ScreenMode, string>> = {};
  const available: ScreenMode[] = ["scan", "investigate", "act"];

  // Build rationale for each mode
  if (isMorning) {
    rationale.scan = "Morning check-in, low urgency";
  } else if (isEvening) {
    rationale.scan = "End-of-day review, winding down";
  } else {
    rationale.scan = "Quick status overview";
  }

  if (denseSignals) {
    rationale.investigate = "Multiple active signals detected";
  } else {
    rationale.investigate = "Drill into signal details";
  }

  if (hasActionables) {
    rationale.act = `${ctx.trigger_count} actionable item(s) pending`;
  } else {
    rationale.act = "No actionable items right now";
  }

  // Select default mode
  let defaultMode: ScreenMode = "scan";

  if (highUrgency) {
    defaultMode = "act";
  } else if (denseSignals) {
    defaultMode = "investigate";
  } else if (hasActionables && ctx.trust.autonomy_level >= 2) {
    defaultMode = "act";
  } else if (isMorning || isEvening) {
    defaultMode = "scan";
  }

  return { available, default: defaultMode, mode_rationale: rationale };
}

// ============================================
// SELF-EXPLAINING SCREENS (Phase A+, Feature 2)
// ============================================

function buildExplanation(
  intent: ScreenIntent,
  ctx: SystemContext,
): {
  why_this_screen_exists: string;
  why_now: string;
  what_changed_since_last_time?: string;
} {
  const existsReasons: Record<ScreenIntent, string> = {
    monitoring: `You asked about concerns. ${ctx.signal_count} signal(s) and ${ctx.trigger_count} trigger(s) are active.`,
    task_mgmt: `You asked about tasks. ${ctx.trigger_count} pending item(s) in the queue.`,
    decisions: `You asked about decisions. ${ctx.decision_count > 0 ? `${ctx.decision_count} recorded decision(s) available for review` : "No decisions recorded yet"}.`,
    timeline:
      "You asked about activity history. This surfaces the chronological event log.",
    overview: `You asked for a summary. Current state: ${ctx.signal_count} signals, ${ctx.trigger_count} triggers, ${ctx.memory_count} memories.`,
    intelligence: `You asked about insights. ${ctx.memory_count} memories across ${ctx.memory_themes.length} theme(s) are available.`,
    settings: `You asked about configuration. Trust level is ${ctx.trust.autonomy_level} (score ${ctx.trust.trust_score}).`,
  };

  let whyNow: string;
  if (
    ctx.signal_max_severity === "critical" ||
    ctx.signal_max_severity === "high"
  ) {
    whyNow = `${ctx.signal_count} signal(s) active, highest severity: ${ctx.signal_max_severity}.`;
  } else if (ctx.signal_count > 0 || ctx.trigger_count > 0) {
    whyNow = `${ctx.signal_count} signal(s) and ${ctx.trigger_count} pending trigger(s) in the system.`;
  } else {
    whyNow = "System is quiet. No urgent items detected.";
  }

  let whatChanged: string | undefined;
  if (ctx.last_design_view_at && ctx.last_design_signal_count !== null) {
    const delta = ctx.signal_count - ctx.last_design_signal_count;
    if (delta > 0) {
      whatChanged = `${delta} new signal(s) since your last view.`;
    } else if (delta < 0) {
      whatChanged = `${Math.abs(delta)} signal(s) resolved since your last view.`;
    } else {
      whatChanged = "Signal count unchanged since your last view.";
    }
  }

  return {
    why_this_screen_exists: existsReasons[intent],
    why_now: whyNow,
    what_changed_since_last_time: whatChanged,
  };
}

// ============================================
// TEMPORAL CONTEXT (Phase A+, Feature 4)
// ============================================

function buildTemporalContext(ctx: SystemContext): {
  now: string;
  since_last_view?: string;
} {
  const parts: string[] = [];
  if (ctx.signal_count > 0) {
    parts.push(`${ctx.signal_count} active signal(s)`);
  }
  if (ctx.trigger_count > 0) {
    parts.push(`${ctx.trigger_count} pending trigger(s)`);
  }
  if (ctx.memory_count > 0) {
    parts.push(`${ctx.memory_count} stored memories`);
  }
  const now =
    parts.length > 0
      ? parts.join(", ") + "."
      : "No active signals or pending triggers.";

  let sinceLastView: string | undefined;
  if (ctx.last_design_view_at && ctx.last_design_signal_count !== null) {
    const lastDate = new Date(ctx.last_design_view_at);
    const elapsed = Date.now() - lastDate.getTime();
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    const timeAgo =
      days > 0 ? `${days} day(s) ago` : `${Math.max(1, hours)} hour(s) ago`;

    const delta = ctx.signal_count - ctx.last_design_signal_count;
    if (delta > 0) {
      sinceLastView = `Last checked ${timeAgo}. ${delta} new signal(s) since then.`;
    } else if (delta < 0) {
      sinceLastView = `Last checked ${timeAgo}. ${Math.abs(delta)} signal(s) resolved since then.`;
    } else {
      sinceLastView = `Last checked ${timeAgo}. Signal count unchanged.`;
    }
  }

  return { now, since_last_view: sinceLastView };
}

// ============================================
// DESIGNED ABSENCE (Phase A+, Feature 3)
// ============================================

function detectAbsence(
  ctx: SystemContext,
  request: string,
): AbsenceProposal | null {
  const lower = request.toLowerCase();

  // Only trigger absence for attention-seeking queries when there's nothing
  const isAttentionQuery =
    lower.includes("what should i") ||
    lower.includes("anything for me") ||
    lower.includes("what needs") ||
    lower.includes("what do i need") ||
    lower.includes("look at right now");

  if (!isAttentionQuery) return null;

  if (ctx.signal_count === 0 && ctx.trigger_count === 0) {
    return {
      proposal_type: "ui_absence",
      reason: "no_active_signals",
      message:
        "Nothing surfaced. No active signals, no pending triggers. Everything is stable.",
      next_check_in: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  // Everything is low-priority and sparse
  if (
    ctx.signal_max_severity === "none" ||
    ctx.signal_max_severity === "low"
  ) {
    const totalItems = ctx.signal_count + ctx.trigger_count;
    if (totalItems <= 2) {
      return {
        proposal_type: "ui_absence",
        reason: "nothing_actionable",
        message: `${totalItems} low-priority item(s) in the system. Nothing requires immediate attention.`,
        next_check_in: new Date(
          Date.now() + 60 * 60 * 1000,
        ).toISOString(),
      };
    }
  }

  return null;
}

// ============================================
// COMPONENT TEMPLATES
// ============================================

function buildComponents(
  intent: ScreenIntent,
  ctx: SystemContext,
): ScreenComponent[] {
  const components: ScreenComponent[] = [];

  switch (intent) {
    case "monitoring":
      components.push(
        {
          name: "SignalSeverityBanner",
          priority: "primary",
          data_source: "pulse_signals",
          empty_state: "All clear — no active concerns",
          loading_state: "Checking signals...",
          error_state: "Unable to load signals. Try refreshing.",
          interactions: ["tap to expand signal detail", "swipe to dismiss"],
          accessibility_note: "Announces severity level on focus",
          props: ["severity_level", "signal_count", "top_signal_summary"],
          message:
            ctx.signal_count > 0
              ? `${ctx.signal_count} active signal(s) detected`
              : undefined,
        },
        {
          name: "TriggerQueue",
          priority: "primary",
          data_source: "pulse_trigger_candidates",
          empty_state: "No pending triggers — you're on track",
          loading_state: "Loading pending items...",
          error_state: "Couldn't load triggers. Retry available.",
          interactions: [
            "acknowledge trigger",
            "dismiss trigger",
            "act on trigger",
          ],
          accessibility_note:
            "List of pending items, each with action buttons",
          props: ["trigger_list", "pending_count"],
          message:
            ctx.trigger_count > 0
              ? `${ctx.trigger_count} item(s) need attention`
              : undefined,
        },
        {
          name: "ConfidenceGauge",
          priority: "secondary",
          data_source: "pulse_trust_state",
          empty_state: "Trust state not yet calibrated",
          interactions: ["tap for trust history"],
          props: ["autonomy_level", "trust_score"],
          accessibility_note: "Displays current trust level as a gauge",
        },
        {
          name: "RecentActivityFeed",
          priority: "tertiary",
          data_source: "pulse_observer_events",
          empty_state: "No recent activity",
          loading_state: "Loading activity...",
          interactions: ["scroll", "tap event for detail"],
          props: ["event_list", "time_range"],
          accessibility_note: "Chronological list of recent system events",
        },
      );
      break;

    case "task_mgmt":
      components.push(
        {
          name: "TaskList",
          priority: "primary",
          data_source: "pulse_trigger_candidates",
          empty_state: "No open tasks — well done",
          loading_state: "Loading tasks...",
          error_state: "Couldn't fetch tasks. Pull to retry.",
          interactions: [
            "mark complete",
            "defer task",
            "expand for detail",
          ],
          accessibility_note: "Sortable list of tasks with action buttons",
          props: ["task_items", "sort_order", "filter_status"],
        },
        {
          name: "StalledTasksAlert",
          priority: "primary",
          data_source: "pulse_signals",
          when: "stalled_task_defer_loop signals exist",
          empty_state: "No stalled tasks",
          interactions: ["tap to replan", "dismiss"],
          props: ["stalled_items", "days_stalled"],
          accessibility_note:
            "Highlighted alert for tasks that need replanning",
        },
        {
          name: "QuickAddBar",
          priority: "secondary",
          interactions: ["type to add task", "voice input"],
          props: ["placeholder_text"],
          accessibility_note: "Text input for quickly adding new tasks",
        },
      );
      break;

    case "decisions":
      components.push(
        {
          name: "DecisionLog",
          priority: "primary",
          data_source: "pulse_decisions",
          empty_state: "No recorded decisions yet",
          loading_state: "Loading decision history...",
          error_state: "Couldn't load decisions.",
          interactions: [
            "tap for reasoning",
            "filter by outcome",
            "search",
          ],
          props: ["decision_list", "show_reasoning", "show_alternatives"],
          accessibility_note:
            "List of past decisions with expandable reasoning",
        },
        {
          name: "PendingProposals",
          priority: "primary",
          data_source: "pulse_proposals",
          when: "pending proposals exist",
          empty_state: "No proposals awaiting your review",
          interactions: ["approve", "reject", "request refinement"],
          props: ["proposal_list", "pending_count"],
          accessibility_note:
            "Approval queue with approve/reject actions per item",
        },
        {
          name: "OutcomeTracker",
          priority: "secondary",
          data_source: "pulse_decisions",
          empty_state: "Not enough history for outcome tracking",
          interactions: ["tap for decision detail"],
          props: ["outcome_summary", "trend_direction"],
          accessibility_note: "Visual summary of decision outcomes over time",
        },
      );
      break;

    case "timeline":
      components.push(
        {
          name: "ActivityTimeline",
          priority: "primary",
          data_source: "pulse_observer_events",
          empty_state: "No activity recorded yet",
          loading_state: "Loading timeline...",
          error_state: "Couldn't load activity history.",
          interactions: ["scroll", "filter by type", "tap for detail"],
          props: ["event_stream", "time_range", "filter_type"],
          accessibility_note:
            "Chronological timeline of events, filterable by type",
        },
        {
          name: "DayMarkers",
          priority: "secondary",
          interactions: ["tap to jump to date"],
          props: ["date_labels"],
          accessibility_note: "Date markers for timeline navigation",
        },
      );
      break;

    case "intelligence":
      components.push(
        {
          name: "InsightCards",
          priority: "primary",
          data_source: "pulse_memory_events",
          empty_state: "Pulse hasn't learned enough yet — keep going",
          loading_state: "Gathering insights...",
          interactions: ["tap for detail", "mark as useful", "dismiss"],
          props: ["insight_list", "confidence_indicators"],
          accessibility_note:
            "Cards showing learned patterns with confidence levels",
        },
        {
          name: "PatternDetector",
          priority: "primary",
          data_source: "pulse_signals",
          when: "intelligence signals exist",
          empty_state: "No patterns detected yet",
          interactions: ["tap to explore", "acknowledge"],
          props: ["patterns", "evidence_links"],
          accessibility_note: "Detected behavioral patterns with evidence",
        },
        {
          name: "LearningProgress",
          priority: "secondary",
          data_source: "pulse_memory_events",
          interactions: ["tap for memory detail"],
          props: [
            "memory_count",
            "memory_type_breakdown",
            "learning_velocity",
          ],
          accessibility_note:
            "Summary of how much Pulse has learned about the user",
          message:
            ctx.memory_count > 0
              ? `${ctx.memory_count} memories stored across ${ctx.memory_themes.length} theme(s)`
              : undefined,
        },
      );
      break;

    case "settings":
      components.push(
        {
          name: "TrustLevelControl",
          priority: "primary",
          data_source: "pulse_trust_state",
          interactions: ["adjust slider", "confirm change"],
          props: ["current_level", "level_descriptions", "change_history"],
          accessibility_note:
            "Slider control for autonomy level with descriptions per level",
        },
        {
          name: "NotificationPreferences",
          priority: "secondary",
          interactions: ["toggle", "set quiet hours"],
          props: ["notification_channels", "quiet_hours_range"],
          accessibility_note:
            "Toggle switches for notification preferences",
        },
        {
          name: "DataSourceStatus",
          priority: "secondary",
          data_source: "pulse_signals",
          empty_state: "No data sources connected",
          interactions: ["connect source", "disconnect source"],
          props: ["sources", "connection_status"],
          accessibility_note:
            "List of connected data sources with status indicators",
        },
      );
      break;

    case "overview":
    default:
      components.push(
        {
          name: "StatusCardGrid",
          priority: "primary",
          data_source: "pulse_signals",
          empty_state: "Welcome to Pulse — connect a data source to begin",
          loading_state: "Loading your overview...",
          interactions: ["tap card for detail"],
          props: ["cards", "grid_columns"],
          accessibility_note: "Grid of status cards with key metrics",
          message:
            ctx.signal_count > 0
              ? `${ctx.signal_count} active signals`
              : undefined,
        },
        {
          name: "TrustMeter",
          priority: "secondary",
          data_source: "pulse_trust_state",
          interactions: ["tap for trust detail"],
          props: ["autonomy_level", "trust_score"],
          accessibility_note: "Visual indicator of current autonomy level",
        },
        {
          name: "QuickActions",
          priority: "secondary",
          interactions: ["tap action button"],
          props: ["action_list"],
          accessibility_note: "Row of quick-access action buttons",
        },
        {
          name: "RecentSignalFeed",
          priority: "tertiary",
          data_source: "pulse_signals",
          empty_state: "No recent signals",
          interactions: ["scroll", "tap for detail"],
          props: ["signal_list", "time_range"],
          accessibility_note: "Feed of latest signals",
        },
      );
      break;
  }

  return components;
}

// ============================================
// TONE GUIDELINES
// ============================================

const TONE_MAP: Record<string, string[]> = {
  calm: [
    "Use soft language — suggest, not demand",
    "Muted color palette; avoid red unless critical",
    "Generous whitespace; nothing should feel crowded",
    "Animations should be subtle and slow (300ms+)",
  ],
  focused: [
    "Lead with the single most important metric",
    "Minimize navigation options visible at once",
    "Use monochrome with one accent color for actions",
    "Hide secondary information behind progressive disclosure",
  ],
  executive: [
    "Data-dense layout; show numbers, not explanations",
    "Use professional typography; no playful fonts",
    "Status indicators should be precise (%, count, trend arrow)",
    "Default to table/list views over cards",
  ],
  playful: [
    "Use conversational labels and microcopy",
    "Allow personality in empty states and loading text",
    "Rounded corners, gentle shadows, warm palette",
    "Celebrate completions with subtle motion",
  ],
};

function buildToneGuidelines(tone?: string): string[] {
  return TONE_MAP[tone ?? "calm"] ?? TONE_MAP["calm"];
}

// ============================================
// LAYOUT DETERMINATION
// ============================================

function determineLayout(
  constraints: { platform?: string; density?: string } | undefined,
  componentCount: number,
) {
  const platform = constraints?.platform ?? "universal";
  const density = constraints?.density ?? "medium";

  if (platform === "mobile") {
    return {
      type: "single_column_scroll",
      columns: { mobile: 1 },
    };
  }

  const desktopCols = density === "high" ? 3 : density === "low" ? 1 : 2;
  const tabletCols = Math.min(desktopCols, 2);

  return {
    type:
      componentCount <= 2 ? "single_column_scroll" : "responsive_grid",
    columns: {
      desktop: desktopCols,
      tablet: tabletCols,
      mobile: 1,
    },
  };
}

// ============================================
// RATIONALE BUILDER
// ============================================

function buildRationale(
  intent: ScreenIntent,
  ctx: SystemContext,
  constraints:
    | { platform?: string; tone?: string; density?: string }
    | undefined,
) {
  const contextConsidered: string[] = [];
  if (ctx.signal_count > 0)
    contextConsidered.push(
      `${ctx.signal_count} active signals (types: ${ctx.signal_types.join(", ") || "none"})`,
    );
  if (ctx.trigger_count > 0)
    contextConsidered.push(`${ctx.trigger_count} pending triggers`);
  if (ctx.memory_count > 0)
    contextConsidered.push(
      `${ctx.memory_count} stored memories (themes: ${ctx.memory_themes.join(", ") || "none"})`,
    );
  contextConsidered.push(
    `Trust level ${ctx.trust.autonomy_level} (score ${ctx.trust.trust_score})`,
  );
  if (ctx.decision_count > 0)
    contextConsidered.push(`${ctx.decision_count} recorded decisions`);

  const layoutReason =
    intent === "monitoring"
      ? "Priority-stacked layout surfaces the most urgent concerns first, with detail available on drill-down"
      : intent === "task_mgmt"
        ? "Linear task list with inline actions minimizes context-switching and supports flow state"
        : intent === "decisions"
          ? "Split view separates pending decisions from historical outcomes for pattern recognition"
          : intent === "timeline"
            ? "Chronological scroll with date markers supports natural time-based navigation"
            : intent === "intelligence"
              ? "Card-based layout allows scanning of independent insights without forced reading order"
              : intent === "settings"
                ? "Grouped controls with clear labels support quick adjustments without cognitive overhead"
                : "Grid overview provides at-a-glance status with drill-down for each domain";

  const componentReason =
    ctx.signal_count > 0 && ctx.trigger_count > 0
      ? `Components chosen to surface ${ctx.signal_count} active signals and ${ctx.trigger_count} pending triggers based on current system state`
      : ctx.signal_count > 0
        ? `Components focus on signal visibility based on ${ctx.signal_count} active signals`
        : ctx.trigger_count > 0
          ? `Components emphasize pending actions based on ${ctx.trigger_count} pending triggers`
          : "Components provide foundational structure for when data begins flowing";

  return {
    why_this_layout: layoutReason,
    why_these_components: componentReason,
    user_context_considered: contextConsidered,
    alternatives_rejected: [
      {
        option: "Tabbed interface",
        reason:
          "Tabs hide important information behind clicks — priority-stacking keeps the most urgent items visible",
      },
      {
        option: "Single metric hero",
        reason:
          "A single metric loses the multi-dimensional nature of the user's context",
      },
    ],
  };
}

// ============================================
// DATA SOURCE BINDINGS
// ============================================

function bindDataSources(
  components: ScreenComponent[],
): Array<{ component_name: string; binds_to: string; query_hint?: string }> {
  return components
    .filter((c) => c.data_source)
    .map((c) => ({
      component_name: c.name,
      binds_to: c.data_source!,
      query_hint: `SELECT * FROM ${c.data_source} WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20`,
    }));
}

// ============================================
// NAVIGATION DEFAULTS
// ============================================

const INTENT_SECTIONS: Record<ScreenIntent, string> = {
  monitoring: "Awareness",
  task_mgmt: "Execution",
  decisions: "Decisions",
  timeline: "History",
  overview: "Home",
  intelligence: "Intelligence",
  settings: "Settings",
};

function buildNavigation(intent: ScreenIntent) {
  return {
    parent_screen: intent === "overview" ? undefined : "pulse_command_center",
    child_screens: [] as string[],
    related_screens:
      intent === "monitoring"
        ? ["pulse_activity_timeline", "pulse_task_board"]
        : intent === "task_mgmt"
          ? ["pulse_concerns_dashboard", "pulse_decision_center"]
          : intent === "overview"
            ? [
                "pulse_concerns_dashboard",
                "pulse_task_board",
                "pulse_insight_feed",
              ]
            : [],
    back_behavior: "stack" as const,
  };
}

// ============================================
// VARIANT GENERATION (0-2 MAX)
// ============================================

function generateVariants(
  intent: ScreenIntent,
  constraints:
    | { platform?: string; tone?: string; density?: string }
    | undefined,
): DesignProposal["variants"] {
  const variants: NonNullable<DesignProposal["variants"]> = [];

  if (!constraints?.density || constraints.density === "medium") {
    variants.push({
      variant_name: "compact",
      description: "Higher information density for power users",
      differs_in: ["layout.columns", "component spacing", "font size"],
      recommended_for: "Users who prefer data-dense interfaces",
    });
  }

  if (
    !constraints?.platform ||
    constraints.platform === "web" ||
    constraints.platform === "universal"
  ) {
    variants.push({
      variant_name: "mobile_first",
      description:
        "Touch-optimized with larger tap targets and swipe gestures",
      differs_in: [
        "layout.type -> single_column_scroll",
        "interaction_model -> swipe-primary",
        "component sizing",
      ],
      recommended_for: "Mobile-first users or responsive deployment",
    });
  }

  return variants.slice(0, 2);
}

// ============================================
// MODALITY HANDOFF SUGGESTION (Phase C, C4)
// ============================================

function buildSurfaceSuggestion(
  componentCount: number,
  constraints: { platform?: string; density?: string } | undefined,
): { recommended: "desktop" | "mobile" | "voice"; reason: string } | undefined {
  const platform = constraints?.platform ?? "universal";

  // Don't suggest if platform is already specified
  if (platform !== "universal") return undefined;

  if (componentCount > 4) {
    return {
      recommended: "desktop",
      reason: "This screen has multiple dense components — easier to review on a wider display.",
    };
  }

  if (componentCount <= 2) {
    return {
      recommended: "mobile",
      reason: "This is a lightweight screen — works well on mobile.",
    };
  }

  return undefined;
}

// ============================================
// OBSERVER LOGGING
// ============================================

async function logDesignEvent(
  userId: string,
  kind: string,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: kind,
      payload: { ...meta, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the tool call if logging fails
  }
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function proposeScreen(input: unknown): Promise<{
  ok: boolean;
  proposal_id?: string;
  proposal?: DesignProposal;
  absence?: AbsenceProposal;
  presented_text?: string;
  presented_meta?: {
    posture: string;
    familiarity: number;
    lint_violations: string[];
  };
  error?: string;
}> {
  // 1. Validate input
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { target_user_id, request, context_hint, constraints } = parsed.data;

  try {
    // 2. Gather system context
    const ctx = await gatherContext(target_user_id);

    // 3. Check for designed absence (Phase A+, Feature 3)
    const absence = detectAbsence(ctx, request);
    if (absence) {
      const callId = `absence-${crypto.randomUUID()}`;
      const { data: absenceData } = await getSupabase()
        .from("pulse_proposals")
        .insert({
          call_id: callId,
          tool: "design.propose_screen",
          scope: "propose",
          agent: "design_intelligence",
          intent: request,
          inputs: {
            proposal_type: "ui_absence",
            reason: absence.reason,
            message: absence.message,
            next_check_in: absence.next_check_in ?? null,
          },
          status: "pending",
          verdict: "require_human",
          user_id: target_user_id,
        })
        .select("id")
        .single();

      // Shape absence message through personhood pipeline
      let presentedText: string | undefined;
      let presentedMeta:
        | { posture: string; familiarity: number; lint_violations: string[] }
        | undefined;
      try {
        const personCtx = await buildContext(target_user_id, {
          autonomy_level: ctx.trust.autonomy_level,
          trust_score: ctx.trust.trust_score,
          proposal_type: "ui_absence",
        });
        const shaped = shape(absence.message, personCtx);
        presentedText = shaped.text;
        presentedMeta = {
          posture: shaped.posture,
          familiarity: shaped.familiarity_level,
          lint_violations: shaped.lint_result.violations,
        };
      } catch {
        presentedText = absence.message;
      }

      // Log absence event (non-blocking)
      logDesignEvent(target_user_id, "design_absence_presented", {
        reason: absence.reason,
        signal_count: ctx.signal_count,
        trigger_count: ctx.trigger_count,
        proposal_id: absenceData?.id ?? null,
        posture: presentedMeta?.posture ?? null,
        familiarity: presentedMeta?.familiarity ?? null,
        lint_violation_count: presentedMeta?.lint_violations.length ?? 0,
      }).catch(() => {});

      return {
        ok: true,
        proposal_id: absenceData?.id,
        absence,
        presented_text: presentedText,
        presented_meta: presentedMeta,
      };
    }

    // 4. Classify request
    const intent = classifyRequest(request);

    // 5. Infer missing constraints from context
    const resolvedConstraints = {
      platform: constraints?.platform ?? "universal",
      tone:
        constraints?.tone ??
        (ctx.trust.autonomy_level >= 3 ? "focused" : "calm"),
      density:
        constraints?.density ??
        (ctx.signal_count > 10
          ? "high"
          : ctx.signal_count > 3
            ? "medium"
            : "low"),
    };

    // 6. Generate components
    const components = buildComponents(intent, ctx);

    // 7. Build screen modes (Phase A+, Feature 1)
    const screenModes = selectScreenMode(ctx);

    // 8. Build explanation (Phase A+, Feature 2)
    const explanation = buildExplanation(intent, ctx);

    // 9. Build temporal context (Phase A+, Feature 4)
    const temporalContext = buildTemporalContext(ctx);

    // 10. Build full proposal
    const proposal: DesignProposal = {
      screen_name: INTENT_SCREEN_NAMES[intent],
      intent: request,
      rationale: buildRationale(intent, ctx, resolvedConstraints),
      placement: {
        app_section: INTENT_SECTIONS[intent],
        navigation_level: intent === "overview" ? "primary" : "secondary",
        icon: INTENT_ICONS[intent],
      },
      navigation: buildNavigation(intent),
      layout: determineLayout(resolvedConstraints, components.length),
      components,
      interaction_model: {
        primary_action:
          intent === "monitoring"
            ? "Acknowledge most urgent concern"
            : intent === "task_mgmt"
              ? "Complete top task"
              : intent === "decisions"
                ? "Review pending proposal"
                : "View detail",
        secondary_action:
          intent === "monitoring"
            ? "Dismiss non-critical signals"
            : intent === "task_mgmt"
              ? "Add new task"
              : intent === "decisions"
                ? "View decision history"
                : "Filter view",
      },
      tone_guidelines: buildToneGuidelines(resolvedConstraints.tone),
      screen_modes: screenModes,
      explanation,
      temporal_context: temporalContext,
      surface_suggestion: buildSurfaceSuggestion(components.length, resolvedConstraints),
      data_sources: bindDataSources(components),
      variants: generateVariants(intent, resolvedConstraints),
      future_extensions: [
        "Conversational refinement ('make this calmer')",
        "Cursor handoff for implementation",
        "Figma spec auto-generation",
        "A/B variant testing with feedback loop",
      ],
      on_approval: {
        create_implementation_task: true,
        notify_cursor: false,
        add_to_design_backlog: true,
        generate_figma_spec: false,
      },
    };

    // 11. Write to pulse_proposals
    const callId = `design-${crypto.randomUUID()}`;
    const { data, error } = await getSupabase()
      .from("pulse_proposals")
      .insert({
        call_id: callId,
        tool: "design.propose_screen",
        scope: "propose",
        agent: "design_intelligence",
        intent: request,
        inputs: {
          proposal_type: "ui_screen",
          context_hint: context_hint ?? null,
          constraints: resolvedConstraints,
          proposal,
        },
        status: "pending",
        verdict: "require_human",
        user_id: target_user_id,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    // 12. Shape through conversational presentation (Phase A+, Feature 5)
    let presentedText: string | undefined;
    let presentedMeta:
      | { posture: string; familiarity: number; lint_violations: string[] }
      | undefined;
    try {
      const personCtx = await buildContext(target_user_id, {
        autonomy_level: ctx.trust.autonomy_level,
        trust_score: ctx.trust.trust_score,
        proposal_type: "ui_screen",
        signal_severity: ctx.signal_max_severity as
          | "none"
          | "low"
          | "medium"
          | "high"
          | "critical",
      });

      const summaryLines: string[] = [];
      summaryLines.push(explanation.why_this_screen_exists);
      summaryLines.push(explanation.why_now);
      if (temporalContext.since_last_view) {
        summaryLines.push(temporalContext.since_last_view);
      }
      summaryLines.push(
        `${components.length} components, default mode: ${screenModes.default}.`,
      );
      if (screenModes.mode_rationale[screenModes.default]) {
        summaryLines.push(screenModes.mode_rationale[screenModes.default]!);
      }

      const rawText = summaryLines.join(" ");
      const shaped = shape(rawText, personCtx);
      presentedText = shaped.text;
      presentedMeta = {
        posture: shaped.posture,
        familiarity: shaped.familiarity_level,
        lint_violations: shaped.lint_result.violations,
      };
    } catch {
      // Personhood failure never blocks the proposal
    }

    // 13. Log observer events (non-blocking)
    logDesignEvent(target_user_id, "design_proposal_created", {
      screen_name: proposal.screen_name,
      tone: resolvedConstraints.tone,
      density: resolvedConstraints.density,
      platform: resolvedConstraints.platform,
      component_count: components.length,
      mode: screenModes.default,
      proposal_id: data.id,
    }).catch(() => {});

    logDesignEvent(target_user_id, "design_proposal_presented", {
      proposal_id: data.id,
      screen_name: proposal.screen_name,
      mode: screenModes.default,
      posture: presentedMeta?.posture ?? null,
      familiarity: presentedMeta?.familiarity ?? null,
      lint_violation_count: presentedMeta?.lint_violations.length ?? 0,
      signal_count: ctx.signal_count,
      trigger_count: ctx.trigger_count,
      has_temporal_delta: !!temporalContext.since_last_view,
    }).catch(() => {});

    return {
      ok: true,
      proposal_id: data.id,
      proposal,
      presented_text: presentedText,
      presented_meta: presentedMeta,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Unknown error generating design proposal",
    };
  }
}

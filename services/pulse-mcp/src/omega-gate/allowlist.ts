// omega-gate/allowlist.ts
// Canonical tool allowlist — static, hardcoded, no runtime mutation.
// If it's not in this map, it does not exist.

export type Scope = "read" | "plan" | "simulate" | "propose" | "execute";
export type Effect = "none" | "read_only" | "ephemeral" | "draft" | "writes_required";

export interface InputSchema {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export interface AllowlistEntry {
  scopes: Scope[];
  effect: Effect;
  confidenceMin?: number;
  description: string;
  inputSchema?: InputSchema;
}

// Shared input schema fragments
// NOTE: target_user_id is OPTIONAL — server injects default if omitted
const TARGET_USER_SCHEMA = {
  target_user_id: {
    type: "string",
    description: "Optional. If omitted, server injects default target user.",
  },
} as const;

const LIMIT_SCHEMA = {
  limit: { type: "number", description: "Maximum number of results (1-200, default 50)" },
} as const;

export const OMEGA_ALLOWLIST: Record<string, AllowlistEntry> = {
  "mcp.tick": {
    scopes: ["read"],
    effect: "none",
    description: "Connectivity proof and round-trip verification through Omega Gate",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  "observer.query": {
    scopes: ["read"],
    effect: "none",
    description: "Query observer events and system state",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
        event_type: { type: "string", description: "Filter by event type" },
      },
      // NOTE: no required — target_user_id injected server-side
    },
  },
  "state.inspect": {
    scopes: ["read"],
    effect: "read_only",
    description: "Inspect current Pulse runtime state",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
      },
      // NOTE: no required — target_user_id injected server-side
    },
  },
  "state.signals": {
    scopes: ["read"],
    effect: "read_only",
    description: "List recent signals",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
      },
      // NOTE: no required — target_user_id injected server-side
    },
  },
  "state.drafts": {
    scopes: ["read"],
    effect: "read_only",
    description: "List recent drafts",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
      },
      // NOTE: no required — target_user_id injected server-side
    },
  },
  "state.outcomes": {
    scopes: ["read"],
    effect: "read_only",
    description: "List recent outcomes",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
      },
      // NOTE: no required — target_user_id injected server-side
    },
  },
  "state.confidence": {
    scopes: ["read"],
    effect: "read_only",
    description: "List confidence events for calibration",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
      },
      // NOTE: no required — target_user_id injected server-side
    },
  },
  "plan.simulate": {
    scopes: ["simulate"],
    effect: "ephemeral",
    description: "Simulate a plan without side effects",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        plan: { type: "string", description: "Plan to simulate" },
      },
      required: ["plan"], // only plan is required, target_user_id injected
    },
  },
  "plan.propose": {
    scopes: ["propose"],
    effect: "draft",
    description: "Propose a plan for human review",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        plan: { type: "string", description: "Plan content to propose" },
        rationale: { type: "string", description: "Explanation for the proposal" },
      },
      required: ["plan"], // only plan is required, target_user_id injected
    },
  },
  "plan.propose_patch": {
    scopes: ["propose"],
    effect: "draft",
    description: "Propose a plan patch for human review",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        patch: { type: "string", description: "Patch content to propose" },
        rationale: { type: "string", description: "Explanation for the patch" },
      },
      required: ["patch"], // only patch is required, target_user_id injected
    },
  },
  "state.propose_patch": {
    scopes: ["propose"],
    effect: "draft",
    description: "Propose a state change for human review",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        patch: { type: "string", description: "State patch to propose" },
        rationale: { type: "string", description: "Explanation for the change" },
      },
      required: ["patch"], // only patch is required, target_user_id injected
    },
  },
  "action.propose": {
    scopes: ["propose"],
    effect: "draft",
    description: "Propose an action for human approval before execution",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        action: { type: "string", description: "Action to propose" },
        rationale: { type: "string", description: "Explanation for the action" },
      },
      required: ["action"], // only action is required, target_user_id injected
    },
  },
  "action.execute": {
    scopes: ["execute"],
    effect: "writes_required",
    confidenceMin: 0.85,
    description: "Execute an approved action",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        action_id: { type: "string", description: "ID of the approved action to execute" },
      },
      required: ["action_id"], // only action_id is required, target_user_id injected
    },
  },

  // ============================================
  // PHASE 2: MEMORY TOOLS (READ-ONLY)
  // ============================================
  "memory.list": {
    scopes: ["read"],
    effect: "read_only",
    description: "List memory events with optional type filter",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
        memory_type: { type: "string", description: "Filter by type: insight, decision, preference, fact, observation" },
      },
    },
  },
  "memory.recent": {
    scopes: ["read"],
    effect: "read_only",
    description: "Get most recent memories (shorthand for memory.list with small limit)",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
      },
    },
  },
  "memory.search": {
    scopes: ["read"],
    effect: "read_only",
    description: "Full-text search across memory content",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },

  // ============================================
  // PHASE 5: DECISION TOOLS (READ-ONLY)
  // ============================================
  "decision.list": {
    scopes: ["read"],
    effect: "read_only",
    description: "List recorded decisions",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
      },
    },
  },
  "decision.recent": {
    scopes: ["read"],
    effect: "read_only",
    description: "Get most recent decisions",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
      },
    },
  },

  // ============================================
  // PHASE 6: TRUST STATE (READ-ONLY)
  // ============================================
  "trust.state": {
    scopes: ["read"],
    effect: "read_only",
    description: "Get current trust/autonomy level for the user",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
      },
    },
  },

  // ============================================
  // PHASE 4: TRIGGER CANDIDATES (READ-ONLY)
  // ============================================
  "triggers.list": {
    scopes: ["read"],
    effect: "read_only",
    description: "List pending nudge/trigger candidates",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        ...LIMIT_SCHEMA,
        status: { type: "string", description: "Filter by status: pending, acknowledged, dismissed, acted" },
      },
    },
  },

  // ============================================
  // PHASE 7: CONTEXT INJECTION (READ-ONLY)
  // ============================================
  "context.current": {
    scopes: ["read"],
    effect: "read_only",
    description: "Get current context snapshot: recent memory, signals, trust level, upcoming commitments",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
      },
    },
  },

  // ============================================
  // SYSTEM DIAGNOSTICS
  // ============================================
  "system.schema_health": {
    scopes: ["read"],
    effect: "read_only",
    description: "Self-diagnostic: check all required tables exist, RLS enabled, canon policies present",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  "system.smoke_test": {
    scopes: ["read"],
    effect: "read_only",
    description: "Run all core tools and report pass/fail status for each",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
      },
    },
  },

  // ============================================
  // WRITE PRIMITIVES
  // ============================================
  "memory.add": {
    scopes: ["execute"],
    effect: "writes_required",
    description: "Add a memory event (insight, decision, preference, fact, observation)",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        content: { type: "string", description: "Memory content text" },
        memory_type: { type: "string", description: "Type: insight, decision, preference, fact, observation (default: observation)" },
        source: { type: "string", description: "Source: mcp, calendar, email, manual (default: mcp)" },
        importance: { type: "number", description: "Importance 0-1 (default: 0.5)" },
        metadata: { type: "object", description: "Optional metadata JSON" },
      },
      required: ["content"],
    },
  },
  "decision.record": {
    scopes: ["execute"],
    effect: "writes_required",
    description: "Record a decision with reasoning and alternatives",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        decision: { type: "string", description: "The decision made" },
        reasoning: { type: "string", description: "Reasoning behind the decision" },
        alternatives: { type: "array", description: "Alternatives considered" },
        source: { type: "string", description: "Source: mcp, autopilot, manual (default: mcp)" },
        metadata: { type: "object", description: "Optional metadata JSON" },
      },
      required: ["decision"],
    },
  },
  "trigger.upsert": {
    scopes: ["execute"],
    effect: "writes_required",
    description: "Create or update a trigger candidate (nudge). Idempotent on type+message",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        trigger_type: { type: "string", description: "Type: upcoming_commitment, overdue_task, pattern_detected" },
        message: { type: "string", description: "Human-readable trigger message" },
        source_type: { type: "string", description: "Source type (optional)" },
        metadata: { type: "object", description: "Optional metadata JSON" },
      },
      required: ["trigger_type", "message"],
    },
  },
  "trust.state_set": {
    scopes: ["execute"],
    effect: "writes_required",
    description: "Set trust/autonomy level for a user (upsert)",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        autonomy_level: { type: "number", description: "Autonomy level 0-5" },
        trust_score: { type: "number", description: "Trust score 0-1 (optional)" },
      },
      required: ["autonomy_level"],
    },
  },

  // ============================================
  // DESIGN INTELLIGENCE
  // ============================================
  "design.propose_screen": {
    scopes: ["propose"],
    effect: "draft",
    description: "Propose a UI screen design as an approval-gated artifact. No rendering, no side effects.",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        request: { type: "string", description: "Natural language screen request" },
        context_hint: { type: "string", description: "Optional context hint for the design" },
        constraints: { type: "object", description: "Optional: { platform, tone, density }" },
      },
      required: ["request"],
    },
  },
  "design.refine_screen": {
    scopes: ["execute"],
    effect: "draft",
    description: "Refine an existing screen proposal via natural language feedback. Creates a new versioned proposal linked to the parent.",
    inputSchema: {
      type: "object",
      properties: {
        proposal_id: { type: "string", description: "UUID of the parent proposal to refine" },
        feedback: { type: "string", description: "Natural language refinement feedback (e.g. 'too busy', 'remove the gauge', 'explain the timeline')" },
      },
      required: ["proposal_id", "feedback"],
    },
  },
  "design.history": {
    scopes: ["read"],
    effect: "read_only",
    description: "Interface archaeology: reconstruct screen version history, diffs, and rationale. Read-only, no mutation.",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        screen_name: { type: "string", description: "Screen name to look up history for" },
        proposal_id: { type: "string", description: "Specific proposal UUID to trace lineage" },
        from: { type: "string", description: "Start date (ISO) for history range" },
        to: { type: "string", description: "End date (ISO) for history range" },
      },
    },
  },
  "design.check_evolution": {
    scopes: ["propose"],
    effect: "draft",
    description: "Check for evolution opportunities: unused components, simplification suggestions. Creates ui_evolution_suggestion proposals.",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        screen_name: { type: "string", description: "Optional: check a specific screen only" },
      },
    },
  },
  "design.check_coherence": {
    scopes: ["propose"],
    effect: "draft",
    description: "Check for coherence issues: duplicate screens, conflicting metrics, naming inconsistencies. Creates ui_coherence_suggestion proposals.",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
      },
    },
  },

  // ============================================
  // CONVERSATIONAL PERSONHOOD
  // ============================================
  "persona.shape": {
    scopes: ["read"],
    effect: "read_only",
    description: "Shape text or proposal through the Conversational Personhood pipeline (posture, familiarity, linter)",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        text: { type: "string", description: "Raw text to shape" },
        proposal_id: { type: "string", description: "Proposal UUID to load and present conversationally" },
        context_hint: { type: "string", description: "Interaction type hint: design, planning, review, casual" },
        proposal_type: { type: "string", description: "Proposal type for posture selection" },
        signal_severity: { type: "string", description: "Signal severity: none, low, medium, high, critical" },
      },
    },
  },
  "persona.calibrate": {
    scopes: ["execute"],
    effect: "writes_required",
    description: "Record explicit taste feedback to calibrate Pulse conversational style",
    inputSchema: {
      type: "object",
      properties: {
        ...TARGET_USER_SCHEMA,
        feedback: { type: "string", description: "Taste feedback text (e.g. 'too verbose', 'be more decisive')" },
      },
      required: ["feedback"],
    },
  },
};

export function isAllowedTool(tool: string): boolean {
  return tool in OMEGA_ALLOWLIST;
}

export function getToolEntry(tool: string): AllowlistEntry | undefined {
  return OMEGA_ALLOWLIST[tool];
}

export function toolRequiresScope(tool: string, scope: Scope): boolean {
  const entry = OMEGA_ALLOWLIST[tool];
  if (!entry) return false;
  return entry.scopes.includes(scope);
}

export function isProposeTool(tool: string): boolean {
  const entry = OMEGA_ALLOWLIST[tool];
  if (!entry) return false;
  return entry.effect === "draft" && entry.scopes.includes("propose");
}

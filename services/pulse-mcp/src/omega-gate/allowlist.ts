// omega-gate/allowlist.ts
// Canonical tool allowlist — static, hardcoded, no runtime mutation.
// If it's not in this map, it does not exist.

export type Scope = "read" | "plan" | "simulate" | "propose" | "execute";
export type Effect = "none" | "read_only" | "ephemeral" | "draft" | "writes_required";

export interface AllowlistEntry {
  scopes: Scope[];
  effect: Effect;
  confidenceMin?: number;
  description: string;
}

export const OMEGA_ALLOWLIST: Record<string, AllowlistEntry> = {
  "observer.query": {
    scopes: ["read"],
    effect: "none",
    description: "Query observer events and system state",
  },
  "state.inspect": {
    scopes: ["read"],
    effect: "read_only",
    description: "Inspect current Pulse runtime state",
  },
  "state.signals": {
    scopes: ["read"],
    effect: "read_only",
    description: "List recent signals",
  },
  "state.drafts": {
    scopes: ["read"],
    effect: "read_only",
    description: "List recent drafts",
  },
  "state.outcomes": {
    scopes: ["read"],
    effect: "read_only",
    description: "List recent outcomes",
  },
  "state.confidence": {
    scopes: ["read"],
    effect: "read_only",
    description: "List confidence events for calibration",
  },
  "plan.simulate": {
    scopes: ["simulate"],
    effect: "ephemeral",
    description: "Simulate a plan without side effects",
  },
  "plan.propose": {
    scopes: ["propose"],
    effect: "draft",
    description: "Propose a plan for human review",
  },
  "action.execute": {
    scopes: ["execute"],
    effect: "writes_required",
    confidenceMin: 0.85,
    description: "Execute an approved action",
  },
} as const;

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

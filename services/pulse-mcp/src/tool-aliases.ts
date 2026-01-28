// tool-aliases.ts
// Claude rejects tool names containing dots (requires ^[a-zA-Z0-9_-]{1,64}$).
// This module maps internal dotted names (e.g. "observer.query") to
// Claude-safe aliases ("observer_query") and back.
// Non-crashing: invalid names are repaired + logged, never leaked or thrown.

const CLAUDE_TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

/** Check whether a name already satisfies Claude's schema. */
export function isClaudeToolNameValid(name: string): boolean {
  return CLAUDE_TOOL_NAME_RE.test(name);
}

/**
 * Convert any internal tool name into a guaranteed Claude-safe tool name.
 * - Replaces dots and illegal chars with underscores
 * - Collapses consecutive underscores
 * - Strips leading underscores/hyphens
 * - Enforces 1..64 length
 * - Deterministic
 */
export function toClaudeToolName(name: string): string {
  const cleaned = name
    .replace(/\./g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[-_]+/, "")
    .slice(0, 64);
  return cleaned.length ? cleaned : "tool";
}

/**
 * Final-boundary safe emitter. Guarantees the returned name passes
 * Claude's ^[a-zA-Z0-9_-]{1,64}$ validation. Falls back to "tool"
 * if the sanitizer somehow produces an invalid result.
 */
export function safeClaudeToolName(realName: string): string {
  const aliased = toClaudeToolName(realName);
  if (!isClaudeToolNameValid(aliased)) return "tool";
  return aliased;
}

// Bidirectional alias maps (populated at startup via registerToolName)
const aliasToReal = new Map<string, string>();
const realToAlias = new Map<string, string>();

/**
 * Register a real tool name → Claude alias mapping.
 * Returns the Claude-safe alias. Handles collisions by appending a suffix.
 */
export function registerToolName(realName: string): string {
  // Already registered
  if (realToAlias.has(realName)) return realToAlias.get(realName)!;

  let alias = safeClaudeToolName(realName);

  // Collision guard: if the alias already points to a different real name, append suffix
  if (aliasToReal.has(alias) && aliasToReal.get(alias) !== realName) {
    let i = 2;
    while (aliasToReal.has(`${alias}_${i}`)) i++;
    alias = `${alias}_${i}`;
  }

  aliasToReal.set(alias, realName);
  realToAlias.set(realName, alias);
  return alias;
}

/**
 * Resolve an incoming tool name (which may be a Claude alias) back to
 * the real internal tool name. Falls through to the original name if
 * no alias is registered.
 */
export function resolveRealToolName(incoming: string): string {
  return aliasToReal.get(incoming) ?? incoming;
}

/**
 * Get the Claude alias for a real tool name.
 * Returns the original name if no alias is registered.
 */
export function getAlias(realName: string): string {
  return realToAlias.get(realName) ?? realName;
}

/**
 * Log when a tool name was repaired during alias registration.
 * Only logs if the name actually changed.
 */
export function logToolNameRepair(realName: string, safeName: string): void {
  if (realName !== safeName) {
    console.warn("[pulse-mcp] tool name repaired", { realName, safeName });
  }
}

// ============================================
// SINGLE BOUNDARY EMITTER — all tool lists go through here
// ============================================

export interface InputSchema {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export interface RawToolDef {
  name: string;
  description: string;
  inputSchema?: InputSchema;
}

export interface ClaudeToolDef {
  name: string;
  description: string;
  inputSchema: InputSchema;
}

/**
 * The ONE function every tool-list emission point must call.
 * Takes raw tool definitions (with internal dotted names) and returns
 * a Claude-safe array. Sanitizes, registers mappings, logs repairs,
 * and drops any name that is still invalid after repair.
 *
 * No invalid tool name can escape this function. Ever.
 */
export function emitClaudeTools(rawTools: RawToolDef[]): ClaudeToolDef[] {
  return rawTools
    .map((t) => {
      const safeName = safeClaudeToolName(t.name);
      // Register bidirectional mapping (idempotent)
      registerToolName(t.name);
      logToolNameRepair(t.name, safeName);
      return {
        name: safeName,
        description: t.description,
        inputSchema: t.inputSchema ?? { type: "object" as const, properties: {} },
      };
    })
    .filter((t) => {
      const ok = isClaudeToolNameValid(t.name);
      if (!ok) {
        console.warn("[pulse-mcp] INVALID TOOL NAME BLOCKED", { name: t.name });
      }
      return ok;
    });
}

// tool-aliases.ts
// Claude rejects tool names containing dots (requires ^[a-zA-Z0-9_-]{1,64}$).
// This module maps internal dotted names (e.g. "observer.query") to
// Claude-safe aliases ("observer_query") and back.

/** Convert an internal tool name to a Claude-compatible name. */
export function toClaudeToolName(name: string): string {
  const cleaned = name
    .replace(/[.\s/]+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return cleaned.slice(0, 64);
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

  let alias = toClaudeToolName(realName);

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

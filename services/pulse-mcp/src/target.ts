// target.ts
// Auto-injects target_user_id when Claude (or any MCP caller) doesn't
// provide one. Uses PULSE_DEFAULT_TARGET_USER_ID from environment.

type AnyObj = Record<string, unknown>;

/**
 * Returns a copy of `input` with `target_user_id` guaranteed to be set.
 * - If caller already provided a non-empty string, it's kept as-is.
 * - Otherwise, injects PULSE_DEFAULT_TARGET_USER_ID from env.
 * - If no default is configured, returns input unchanged (downstream
 *   validation will surface the error gracefully).
 */
export function withInjectedTargetUserId(input: unknown): AnyObj {
  const params: AnyObj =
    input && typeof input === "object" && !Array.isArray(input)
      ? { ...(input as AnyObj) }
      : {};

  // Respect caller-provided value
  if (typeof params.target_user_id === "string" && params.target_user_id.trim().length > 0) {
    return params;
  }

  const fallback = process.env.PULSE_DEFAULT_TARGET_USER_ID?.trim();
  if (!fallback) {
    console.warn("[pulse-mcp] missing target_user_id (no PULSE_DEFAULT_TARGET_USER_ID configured)");
    return params;
  }

  params.target_user_id = fallback;
  return params;
}

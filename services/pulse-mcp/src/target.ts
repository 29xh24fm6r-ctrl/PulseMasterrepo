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

/**
 * Injects target_user_id into ALL possible payload shapes.
 * Covers: inputs, arguments, args, params.inputs, params.arguments
 * This is intentionally redundant for stability — we don't know which
 * shape the validator will read from.
 */
export function injectTargetUserIdIntoAllShapes(body: unknown): AnyObj {
  const b: AnyObj = body && typeof body === "object" && !Array.isArray(body)
    ? { ...(body as AnyObj) }
    : {};

  const fallback = process.env.PULSE_DEFAULT_TARGET_USER_ID?.trim();

  // Nothing we can do without a default; leave unchanged
  if (!fallback) {
    console.warn("[pulse-mcp] injectTargetUserIdIntoAllShapes: no PULSE_DEFAULT_TARGET_USER_ID");
    return b;
  }

  // Helper: set target_user_id if missing
  const ensure = (obj: unknown): AnyObj | undefined => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj as AnyObj | undefined;
    const next = { ...(obj as AnyObj) };
    const v = next.target_user_id;
    if (typeof v !== "string" || v.trim().length === 0) {
      next.target_user_id = fallback;
    }
    return next;
  };

  // JSON-RPC shape: params.arguments or params.inputs
  if (b.params && typeof b.params === "object" && !Array.isArray(b.params)) {
    const p = { ...(b.params as AnyObj) };
    if (p.arguments && typeof p.arguments === "object") {
      p.arguments = ensure(p.arguments);
    }
    if (p.inputs && typeof p.inputs === "object") {
      p.inputs = ensure(p.inputs);
    }
    b.params = p;
  }

  // Non-JSON-RPC shapes: top-level arguments, inputs, args
  if (b.arguments && typeof b.arguments === "object") {
    b.arguments = ensure(b.arguments);
  }
  if (b.inputs && typeof b.inputs === "object") {
    b.inputs = ensure(b.inputs);
  }
  if (b.args && typeof b.args === "object") {
    b.args = ensure(b.args);
  }

  return b;
}

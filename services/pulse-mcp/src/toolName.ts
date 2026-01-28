// toolName.ts
// Conservative tool name normalizer + alias hit classification.
// No heuristics that could surprise — deterministic, lowercase, safe chars only.

/**
 * Alias resolution source:
 * - "none":   no alias matched, tool name used as-is
 * - "static": resolved via registered Claude bidirectional map (underscore↔dots)
 * - "db":     resolved via per-user database alias (pulse_tool_aliases)
 */
export type AliasHit = "none" | "static" | "db";

/**
 * Conservative normalization:
 * - trims whitespace
 * - lowercases
 * - replaces whitespace runs with underscore
 * - keeps only [a-z0-9._-]
 * - collapses repeated separators
 * - strips leading/trailing separators
 *
 * Deterministic: same input always produces same output.
 */
export function normalizeToolName(input: string): string {
  const raw = (input ?? "").trim().toLowerCase();

  // Replace whitespace with underscore
  const wsFixed = raw.replace(/\s+/g, "_");

  // Remove anything that isn't safe for tool names
  const safe = wsFixed.replace(/[^a-z0-9._-]/g, "");

  // Collapse repeated separators, strip leading/trailing separators
  const collapsed = safe
    .replace(/[._-]{2,}/g, (m) => m[0])
    .replace(/^[._-]+|[._-]+$/g, "");

  return collapsed;
}

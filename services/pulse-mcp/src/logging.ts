// logging.ts
// Structured tool resolution logging.
// Single log line per resolution, easy to grep/parse in Cloud Run logs.

import type { ToolResolution } from "./aliases.js";

/**
 * Log a tool name resolution event.
 * Called once per tool call across every path (http, sse, propose, execute).
 */
export function logToolResolution(path: string, r: ToolResolution): void {
  console.log("[pulse-mcp] tool_resolution", {
    path,
    requested_tool: r.requested_tool,
    normalized_tool: r.normalized_tool,
    resolved_tool: r.resolved_tool,
    alias_hit: r.alias_hit,
    viewer_user_id: r.viewer_user_id ?? null,
  });
}

/**
 * Log a tool being blocked by the allowlist.
 * Called when a resolved tool is denied.
 */
export function logToolBlocked(path: string, r: ToolResolution): void {
  console.log("[pulse-mcp] tool_blocked", {
    path,
    requested_tool: r.requested_tool,
    resolved_tool: r.resolved_tool,
    alias_hit: r.alias_hit,
    reason: "allowlist_denied",
  });
}

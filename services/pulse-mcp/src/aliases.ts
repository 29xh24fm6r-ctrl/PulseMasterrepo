// aliases.ts
// Unified tool name resolution chain.
//
// Resolution order:
//   1. Normalize raw input (trim, lowercase, safe chars)
//   2. Resolve Claude static alias (underscore→dots via registered bidirectional map)
//   3. Resolve database per-user alias (on post-normalized canonical name)
//   4. Return structured ToolResolution
//
// Safety: fail-safe + deny by default.
// If DB lookup errors, returns static-resolved name unchanged.
// Allowlist still enforces denial of unknown tools.
//
// Identity: viewerUserId is server-derived (PULSE_MCP_VIEWER_USER_ID env var),
// never caller-supplied. For multi-tenant, replace with auth-derived user id.

import { getSupabase } from "./supabase.js";
import { resolveRealToolName } from "./tool-aliases.js";
import { normalizeToolName, type AliasHit } from "./toolName.js";

export type ToolResolution = {
  requested_tool: string;
  normalized_tool: string;
  resolved_tool: string;
  alias_hit: AliasHit;
  viewer_user_id: string | null;
};

/**
 * INVARIANT: viewerUserId is server-derived (PULSE_MCP_VIEWER_USER_ID env var),
 * never caller-supplied. For multi-tenant, replace with auth-derived user id.
 */
function getViewerUserId(): string | null {
  const v = (process.env.PULSE_MCP_VIEWER_USER_ID ?? "").trim();
  return v || null;
}

/**
 * DB alias lookup (per-user).
 * Fail-safe + deny by default: on any error, return null.
 * Allowlist still enforces denial of unknown tools.
 */
async function lookupDbAlias(
  viewerUserId: string,
  aliasCandidate: string,
): Promise<string | null> {
  try {
    const { data, error } = await getSupabase()
      .from("pulse_tool_aliases")
      .select("canonical_tool")
      .eq("user_id", viewerUserId)
      .eq("alias", aliasCandidate)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[pulse-mcp] alias lookup error (fail-safe, allowlist decides)", {
        viewerUserId,
        alias: aliasCandidate,
        error: error.message,
      });
      return null;
    }

    if (!data?.canonical_tool) return null;

    // Normalize canonical tool name too (defensive)
    return normalizeToolName(data.canonical_tool);
  } catch (e: any) {
    console.warn("[pulse-mcp] alias lookup exception (fail-safe, allowlist decides)", {
      viewerUserId,
      alias: aliasCandidate,
      error: e?.message,
    });
    return null;
  }
}

/**
 * Full tool name resolution chain:
 *   1. Normalize raw input (trim, lowercase, safe chars)
 *   2. Resolve Claude static alias via registered bidirectional map
 *      (e.g. observer_query → observer.query, plan_propose_patch → plan.propose_patch)
 *   3. Resolve database per-user alias (on post-normalized canonical name)
 *   4. Return structured ToolResolution
 *
 * Fail-safe: if DB alias lookup errors, resolved_tool = static-resolved name.
 * Allowlist still enforces denial of unknown tools.
 */
export async function resolveToolName(inputToolName: string): Promise<ToolResolution> {
  const requested_tool = String(inputToolName ?? "");
  const normalized_tool = normalizeToolName(requested_tool);

  // Step 1: Static Claude alias (bidirectional map from tool-aliases.ts)
  // Uses registered map, NOT naive underscore→dot replacement.
  // This correctly handles tools like plan.propose_patch (alias: plan_propose_patch).
  const afterStatic = resolveRealToolName(normalized_tool);
  const staticHit = afterStatic !== normalized_tool;

  // Step 2: DB per-user alias (receives post-normalized canonical name)
  // SAFETY: viewerUserId comes from server env var, NOT from request headers
  const viewer_user_id = getViewerUserId();
  let resolved_tool = afterStatic;
  let alias_hit: AliasHit = staticHit ? "static" : "none";

  if (viewer_user_id) {
    const dbCanonical = await lookupDbAlias(viewer_user_id, afterStatic);
    if (dbCanonical && dbCanonical !== afterStatic) {
      resolved_tool = dbCanonical;
      alias_hit = "db";
    }
  }

  return {
    requested_tool,
    normalized_tool,
    resolved_tool,
    alias_hit,
    viewer_user_id,
  };
}

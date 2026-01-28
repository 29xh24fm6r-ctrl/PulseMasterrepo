import { z } from "zod";
import { getSupabase } from "./supabase.js";

const envSchema = z.object({
  PULSE_MCP_API_KEY: z.string().min(16),
  PULSE_MCP_VIEWER_USER_ID: z.string().min(10),
});

let _env: z.infer<typeof envSchema> | null = null;

function getEnv() {
  if (_env) return _env;
  _env = envSchema.parse({
    PULSE_MCP_API_KEY: process.env.PULSE_MCP_API_KEY,
    PULSE_MCP_VIEWER_USER_ID: process.env.PULSE_MCP_VIEWER_USER_ID,
  });
  return _env;
}

export function requireMcpApiKey(headers: Record<string, string | undefined>) {
  const env = getEnv();
  const provided =
    headers["x-pulse-mcp-key"] ||
    headers["X-Pulse-Mcp-Key"];

  if (!provided || provided !== env.PULSE_MCP_API_KEY) {
    const e = new Error("Unauthorized: missing/invalid x-pulse-mcp-key");
    (e as any).status = 401;
    throw e;
  }
}

export async function assertViewerCanReadTarget(targetUserId: string) {
  const viewer = (process.env.PULSE_MCP_VIEWER_USER_ID ?? "").trim();
  const target = (targetUserId ?? "").trim();

  if (!viewer) {
    const e = new Error("Forbidden: missing PULSE_MCP_VIEWER_USER_ID");
    (e as any).status = 403;
    throw e;
  }

  if (!target) {
    const e = new Error("Forbidden: missing target_user_id");
    (e as any).status = 403;
    throw e;
  }

  // ✅ Fast-path: viewer can always read their own data (single-tenant safe)
  if (viewer === target) {
    return; // allow self-access
  }

  // Log mismatch for debugging multi-tenant scenarios
  console.warn("[pulse-mcp] viewer/target mismatch — checking pulse_mcp_viewers", {
    viewer,
    target,
    viewerLen: viewer.length,
    targetLen: target.length,
  });

  // Fall back to database check for cross-user access
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pulse_mcp_viewers")
    .select("viewer_user_id,target_user_id")
    .eq("viewer_user_id", viewer)
    .eq("target_user_id", target)
    .maybeSingle();

  if (error) throw new Error(`Viewer check failed: ${error.message}`);
  if (!data) {
    const e = new Error("Forbidden: viewer does not have access to target user");
    (e as any).status = 403;
    throw e;
  }
}

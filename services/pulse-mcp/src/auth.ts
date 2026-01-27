import { z } from "zod";
import { supabase } from "./supabase.js";

const envSchema = z.object({
  PULSE_MCP_API_KEY: z.string().min(16),
  PULSE_MCP_VIEWER_USER_ID: z.string().min(10),
});

const env = envSchema.parse({
  PULSE_MCP_API_KEY: process.env.PULSE_MCP_API_KEY,
  PULSE_MCP_VIEWER_USER_ID: process.env.PULSE_MCP_VIEWER_USER_ID,
});

export function requireMcpApiKey(headers: Record<string, string | undefined>) {
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
  const viewerUserId = env.PULSE_MCP_VIEWER_USER_ID;

  const { data, error } = await supabase
    .from("pulse_mcp_viewers")
    .select("viewer_user_id,target_user_id")
    .eq("viewer_user_id", viewerUserId)
    .eq("target_user_id", targetUserId)
    .maybeSingle();

  if (error) throw new Error(`Viewer check failed: ${error.message}`);
  if (!data) {
    const e = new Error("Forbidden: viewer does not have access to target user");
    (e as any).status = 403;
    throw e;
  }
}

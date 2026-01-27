console.log("[pulse-mcp] process started", process.argv);

import express from "express";
import { requireMcpApiKey } from "./auth.js";
import { tools } from "./tools/index.js";
import { getSupabase } from "./supabase.js";
import { handleGateCall, listGateTools } from "./omega-gate/index.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Lazy MCP key accessor (deferred, never throws at import)
function getMcpKey(): string {
  const key = process.env.PULSE_MCP_API_KEY;
  if (!key) throw new Error("PULSE_MCP_API_KEY not set");
  return key;
}

// ============================================
// HEALTH (no auth)
// ============================================
app.get("/healthz", async (_req, res) => {
  try {
    const out = await tools["pulse.health"]!();
    res.status((out as any).ok ? 200 : 500).json(out);
  } catch {
    res.status(200).json({ ok: true, degraded: true });
  }
});

// ============================================
// HEARTBEAT (Cloud Scheduler OIDC)
// ============================================
app.post("/heartbeat", (req, res) => {
  console.log("[pulse-mcp] heartbeat received", {
    source: req.body?.source ?? "unknown",
    ts: new Date().toISOString(),
  });
  res.status(200).json({ ok: true, service: "pulse-mcp", heartbeat: "alive" });
});

// ============================================
// TICK — Observer loop (Cloud Scheduler OIDC)
// ============================================
app.post("/tick", (req, res) => {
  const startedAt = Date.now();

  console.log("[pulse-mcp] tick received", {
    source: req.body?.source ?? "unknown",
    ts: new Date().toISOString(),
  });

  const uptimeSec = Math.round(process.uptime());
  const hasSupabase =
    !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[pulse-mcp] tick observation", {
    uptimeSec,
    hasSupabase,
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });

  res.status(200).json({
    ok: true,
    type: "tick",
    durationMs: Date.now() - startedAt,
  });
});

// ============================================
// OMEGA GATE — /call (x-pulse-mcp-key + full gate protocol)
// ============================================
app.post("/call", async (req, res) => {
  await handleGateCall(req, res, getMcpKey());
});

// ============================================
// TOOL LISTING — /tools (x-pulse-mcp-key)
// ============================================
app.get("/tools", (req, res) => {
  try {
    requireMcpApiKey(req.headers as Record<string, string | undefined>);
    res.json({
      ok: true,
      tools: listGateTools(),
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    res.status(status).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
});

// ============================================
// LEGACY /call (kept for backwards compat, deprecated)
// ============================================
app.post("/call/legacy", async (req, res) => {
  const startMs = Date.now();
  try {
    requireMcpApiKey(req.headers as Record<string, string | undefined>);

    const { tool, input } = req.body ?? {};
    if (!tool || typeof tool !== "string") {
      res.status(400).json({ ok: false, error: "Missing tool" });
      return;
    }

    const fn = tools[tool];
    if (!fn) {
      res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });
      return;
    }

    const result = await fn(input);

    const targetUserId = input?.target_user_id;
    if (targetUserId) {
      try {
        await getSupabase().from("pulse_observer_events").insert({
          user_id: targetUserId,
          event_type: "mcp_tool_call",
          payload: {
            tool,
            durationMs: Date.now() - startMs,
            success: true,
          },
          created_at: new Date().toISOString(),
        });
      } catch {
        // Don't fail the response if logging fails
      }
    }

    res.json({ ok: true, tool, result });
  } catch (e: any) {
    const status = e?.status ?? 500;
    res.status(status).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, "0.0.0.0", () =>
  console.log(`[pulse-mcp] listening on 0.0.0.0:${port}`)
);

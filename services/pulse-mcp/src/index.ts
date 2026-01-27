console.log("[pulse-mcp] process started", process.argv);

import express from "express";
import { requireMcpApiKey } from "./auth.js";
import { tools } from "./tools/index.js";
import { getSupabase } from "./supabase.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check (no auth required)
app.get("/healthz", async (_req, res) => {
  const out = await tools["pulse.health"]!();
  res.status((out as any).ok ? 200 : 500).json(out);
});

// Heartbeat endpoint (Cloud Scheduler, no app-level auth — Cloud Run OIDC handles it)
app.post("/heartbeat", (_req, res) => {
  console.log(`[HEARTBEAT] ${new Date().toISOString()}`);
  res.status(200).json({ ok: true, service: "pulse-mcp", heartbeat: "alive" });
});

// Tool invocation endpoint
app.post("/call", async (req, res) => {
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

    // Log to observer events
    const targetUserId = input?.target_user_id;
    if (targetUserId) {
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
    }

    res.json({ ok: true, tool, result });
  } catch (e: any) {
    const status = e?.status ?? 500;
    res.status(status).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
});

// List available tools
app.get("/tools", (req, res) => {
  try {
    requireMcpApiKey(req.headers as Record<string, string | undefined>);
    res.json({
      ok: true,
      tools: Object.keys(tools).map((name) => ({ name, type: "read-only" })),
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    res.status(status).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
});

const port = Number(process.env.PORT || 8080);
console.log("[pulse-mcp] boot", { PORT: process.env.PORT, NODE_ENV: process.env.NODE_ENV });
app.listen(port, "0.0.0.0", () => console.log(`pulse-mcp listening on 0.0.0.0:${port}`));

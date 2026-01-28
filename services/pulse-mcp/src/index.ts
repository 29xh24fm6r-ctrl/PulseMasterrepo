console.log("[pulse-mcp] process started", process.argv);

import express from "express";
import { requireMcpApiKey } from "./auth.js";
import { tools } from "./tools/index.js";
import { getSupabase } from "./supabase.js";
import { handleGateCall, listGateTools } from "./omega-gate/index.js";
import { mountSseTransport } from "./transport/sse.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Helper to get base URL from request
function getBaseUrl(req: express.Request): string {
  return (
    process.env.BASE_URL ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"] || req.headers.host}`
  );
}

// ============================================
// OAUTH DISCOVERY STUBS (required for Claude.ai MCP connector)
// ============================================

app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ["token"],
    grant_types_supported: ["client_credentials"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

app.get("/.well-known/oauth-protected-resource", (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.json({
    resource: baseUrl,
    authorization_servers: [baseUrl],
  });
});

app.post("/register", (req, res) => {
  res.json({
    client_id: "claude",
    token_endpoint_auth_method: "none",
    grant_types: ["client_credentials"],
  });
});

app.post("/token", (req, res) => {
  res.json({
    access_token: "pulse-mcp-access-token",
    token_type: "Bearer",
    expires_in: 3600,
  });
});

app.get("/authorize", (req, res) => {
  const redirectUri = req.query.redirect_uri as string;
  if (redirectUri) {
    res.redirect(`${redirectUri}?code=authorized`);
  } else {
    res.json({ authorized: true });
  }
});

// Lazy MCP key accessor (deferred, never throws at import)
function getMcpKey(): string {
  const key = process.env.PULSE_MCP_API_KEY;
  if (!key) throw new Error("PULSE_MCP_API_KEY not set");
  return key;
}

// ============================================
// MCP DISCOVERY (unauthenticated handshake)
// ============================================

function isMcpDiscovery(req: express.Request, body: any): boolean {
  if (req.method === "GET") return true;
  if (req.method === "POST") {
    if (!body) return true;
    if (!body.tool && !body.method) return true;
    if (body.method === "list_tools") return true;
  }
  return false;
}

function buildDiscoveryResponse() {
  return {
    protocol: "mcp",
    server: "pulse-mcp",
    version: "1.0",
    tools: listGateTools().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: { type: "object", properties: {} },
    })),
  };
}

// ============================================
// ROOT — MCP discovery (no auth, required for Claude Desktop)
// ============================================
app.get("/", (_req, res) => {
  res.status(200);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    protocol: "mcp",
    server: "pulse-mcp",
    version: "1.0",
    tools: buildDiscoveryResponse().tools
  }));
});

// POST / — MCP message handler (required for Claude.ai)
app.post("/", async (req, res) => {
  // If it's a discovery/handshake request, return discovery
  if (!req.body || !req.body.method || req.body.method === "list_tools") {
    res.json(buildDiscoveryResponse());
    return;
  }

  // Otherwise route to gate call handler
  await handleGateCall(req, res, getMcpKey());
});

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
  const nonce = req.body?.nonce ?? crypto.randomUUID();

  console.log("[pulse-mcp] tick received", {
    source: req.body?.source ?? "unknown",
    nonce,
    ts: new Date().toISOString(),
  });

  res.status(200).json({
    ok: true,
    nonce,
    echo: req.body ?? {},
    server_time: new Date().toISOString(),
  });
});

// ============================================
// OMEGA GATE — /call (MCP discovery + full gate protocol)
// ============================================

// GET /call — unauthenticated MCP discovery
app.get("/call", (_req, res) => {
  res.json(buildDiscoveryResponse());
});

// POST /call — discovery handshake OR authenticated gate execution
app.post("/call", async (req, res) => {
  if (isMcpDiscovery(req, req.body)) {
    res.json(buildDiscoveryResponse());
    return;
  }
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

// ============================================
// SSE TRANSPORT — MCP protocol (Claude.ai / Claude Desktop)
// ============================================
mountSseTransport(app);

const port = Number(process.env.PORT || 8080);
app.listen(port, "0.0.0.0", () =>
  console.log(`[pulse-mcp] listening on 0.0.0.0:${port}`)
);

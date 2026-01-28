console.log("[pulse-mcp] process started", process.argv);
console.log("[pulse-mcp] ids", {
  viewer: process.env.PULSE_MCP_VIEWER_USER_ID?.trim() ?? "(not set)",
  targetDefault: process.env.PULSE_DEFAULT_TARGET_USER_ID?.trim() ?? "(not set)",
});

import express from "express";
import { requireMcpApiKey } from "./auth.js";
import { tools } from "./tools/index.js";
import { getSupabase } from "./supabase.js";
import { handleGateCall, listGateTools } from "./omega-gate/index.js";
import { mountSseTransport } from "./transport/sse.js";
import { emitClaudeTools } from "./tool-aliases.js";
import { withInjectedTargetUserId, injectTargetUserIdIntoAllShapes } from "./target.js";
import { resolveToolName } from "./aliases.js";
import { logToolResolution, logToolBlocked } from "./logging.js";
import { handleCronIntelligence } from "./routes/cron_intelligence.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ============================================
// CLAUDE-SAFE MODE — auth helpers & tool allowlist
// ============================================

function isClaudeRequest(req: express.Request): boolean {
  const ua = String(req.headers["user-agent"] || "");
  return ua.toLowerCase().includes("claude");
}

function getProvidedKey(req: express.Request): string | null {
  const hk = req.headers["x-pulse-mcp-key"];
  if (typeof hk === "string" && hk.trim()) return hk.trim();

  const auth = req.headers["authorization"];
  if (typeof auth === "string") {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return m[1].trim();
  }

  return null;
}

function getKeySource(req: express.Request): "x-pulse-mcp-key" | "authorization" | "none" {
  const hk = req.headers["x-pulse-mcp-key"];
  if (typeof hk === "string" && hk.trim()) return "x-pulse-mcp-key";

  const auth = req.headers["authorization"];
  if (typeof auth === "string" && /^Bearer\s+.+$/i.test(auth)) return "authorization";

  return "none";
}

function assertKeyOrClaudeSafeMode(
  req: express.Request
): { ok: true; mode: "full" | "claude_safe" } | { ok: false; status: number; message: string } {
  const expected = process.env.PULSE_MCP_API_KEY || "";

  const provided = getProvidedKey(req);
  const hasValidKey = Boolean(expected && provided && provided === expected);

  if (hasValidKey) {
    console.log("[pulse-mcp] auth ok", { via: getKeySource(req) });
    return { ok: true, mode: "full" };
  }

  if (isClaudeRequest(req)) return { ok: true, mode: "claude_safe" };

  return { ok: false, status: 401, message: "Invalid or missing x-pulse-mcp-key" };
}

const CLAUDE_SAFE_TOOL_ALLOWLIST = new Set<string>([
  "mcp.tick",
  "observer.query",
  "state.inspect",
  "state.signals",
  "state.drafts",
  "state.outcomes",
  "state.confidence",
  "plan.simulate",
  "plan.propose",
  "plan.propose_patch",
  "state.propose_patch",
  "action.propose",
  // action.execute intentionally excluded
  // Phase 2: Memory (read-only)
  "memory.list",
  "memory.recent",
  "memory.search",
  // Phase 5: Decisions (read-only)
  "decision.list",
  "decision.recent",
  // Phase 6: Trust state (read-only)
  "trust.state",
  // Phase 4: Triggers (read-only)
  "triggers.list",
  // Phase 7: Context (read-only)
  "context.current",
  // System diagnostics
  "system.schema_health",
  "system.smoke_test",
  // Write primitives
  "memory.add",
  "decision.record",
  "trigger.upsert",
  "trust.state_set",
  // Design intelligence
  "design.propose_screen",
  "design.refine_screen",
  "design.history",
  "design.check_evolution",
  "design.check_coherence",
  // Conversational personhood
  "persona.shape",
  "persona.calibrate",
]);

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
    tools: emitClaudeTools(listGateTools()),
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
  // Inject target_user_id into ALL shapes at the very top (before any processing)
  req.body = injectTargetUserIdIntoAllShapes(req.body);

  // If it's a discovery/handshake request, return discovery
  if (!req.body || !req.body.method || req.body.method === "list_tools") {
    res.json(buildDiscoveryResponse());
    return;
  }

  // Handle JSON-RPC 2.0 requests from Claude.ai (OAuth-authenticated)
  if (req.body.jsonrpc === "2.0") {
    const { id, method, params } = req.body;

    if (method === "initialize") {
      res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "pulse-mcp", version: "1.0.0" }
        }
      });
      return;
    }

    if (method === "notifications/initialized") {
      res.status(200).end();
      return;
    }

    if (method === "tools/list") {
      res.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: emitClaudeTools(listGateTools()),
        }
      });
      return;
    }

    if (method === "tools/call") {
      const rawToolName = params?.name ?? "";
      const resolution = await resolveToolName(rawToolName);
      logToolResolution("jsonrpc-tools/call", resolution);
      const toolName = resolution.resolved_tool;

      // Claude-safe mode guard: check allowlist on RESOLVED canonical name
      const auth = assertKeyOrClaudeSafeMode(req);
      if (!auth.ok) {
        res.status(auth.status).json({
          jsonrpc: "2.0", id,
          error: { code: -32600, message: auth.message }
        });
        return;
      }
      if (auth.mode === "claude_safe" && !CLAUDE_SAFE_TOOL_ALLOWLIST.has(toolName)) {
        logToolBlocked("jsonrpc-tools/call", resolution);
        res.status(403).json({
          jsonrpc: "2.0", id,
          error: { code: -32600, message: "Tool not permitted in Claude-safe mode" },
        });
        return;
      }

      try {
        const { executeGateTool } = await import("./omega-gate/executor.js");
        const rawArgs = params?.arguments ?? {};
        const injectedInputs = withInjectedTargetUserId(rawArgs);

        const result = await executeGateTool({
          call_id: `mcp-${crypto.randomUUID()}`,
          tool: toolName,
          intent: `MCP tool call: ${toolName}`,
          inputs: injectedInputs,
        });
        res.json({
          jsonrpc: "2.0", id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result) }],
          },
        });
      } catch (e: any) {
        res.json({
          jsonrpc: "2.0", id,
          result: {
            content: [{ type: "text", text: JSON.stringify({ ok: false, error: e?.message ?? "Unknown error" }) }],
            isError: true,
          },
        });
      }
      return;
    }

    // Unknown JSON-RPC method
    res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: "Method not found" }
    });
    return;
  }

  // Non-JSON-RPC requests: enforce auth or Claude-safe mode
  const auth = assertKeyOrClaudeSafeMode(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.message });
    return;
  }

  const body: any = req.body || {};
  const rawTool =
    body?.tool || body?.name || body?.params?.tool ||
    body?.params?.name || body?.input?.tool || body?.input?.name;
  const resolution = await resolveToolName(
    typeof rawTool === "string" ? rawTool : ""
  );
  logToolResolution("post-root-non-jsonrpc", resolution);
  const toolName = resolution.resolved_tool;

  if (auth.mode === "claude_safe") {
    if (!toolName || !CLAUDE_SAFE_TOOL_ALLOWLIST.has(toolName)) {
      logToolBlocked("post-root-non-jsonrpc", resolution);
      res.status(403).json({
        error: "Tool not permitted in Claude-safe mode",
        tool: toolName || null,
      });
      return;
    }
  }

  // Patch body with resolved canonical tool name so gate sees internal name
  if (body?.tool) body.tool = toolName;
  if (body?.name) body.name = toolName;
  if (body?.params?.tool) body.params.tool = toolName;
  if (body?.params?.name) body.params.name = toolName;
  if (body?.input?.tool) body.input.tool = toolName;
  if (body?.input?.name) body.input.name = toolName;

  // Inject target_user_id into inputs if missing
  if (body?.inputs && typeof body.inputs === "object") {
    body.inputs = withInjectedTargetUserId(body.inputs);
  }

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
// Phase 4: Now includes proactive trigger evaluation
// ============================================
app.post("/tick", async (req, res) => {
  const nonce = req.body?.nonce ?? crypto.randomUUID();
  const targetUserId = process.env.PULSE_DEFAULT_TARGET_USER_ID?.trim();

  console.log("[pulse-mcp] tick received", {
    source: req.body?.source ?? "unknown",
    nonce,
    targetUserId: targetUserId ?? "(not set)",
    ts: new Date().toISOString(),
  });

  let proactiveResult = null;

  // Run proactive evaluation if we have a target user
  if (targetUserId) {
    try {
      const { runProactiveEvaluation } = await import("./proactive/index.js");
      proactiveResult = await runProactiveEvaluation(targetUserId);
      console.log("[pulse-mcp] proactive evaluation complete", proactiveResult);
    } catch (e) {
      console.warn("[pulse-mcp] proactive evaluation failed", { error: e });
    }
  }

  res.status(200).json({
    ok: true,
    nonce,
    echo: req.body ?? {},
    proactive: proactiveResult,
    server_time: new Date().toISOString(),
  });
});

// ============================================
// INTELLIGENCE — /cron/intelligence (Cloud Scheduler OIDC)
// ============================================
app.post("/cron/intelligence", handleCronIntelligence);

// ============================================
// OMEGA GATE — /call (MCP discovery + full gate protocol)
// ============================================

// GET /call — unauthenticated MCP discovery
app.get("/call", (_req, res) => {
  res.json(buildDiscoveryResponse());
});

// POST /call — discovery handshake OR authenticated gate execution
app.post("/call", async (req, res) => {
  // Inject target_user_id into ALL shapes at the very top (before any processing)
  req.body = injectTargetUserIdIntoAllShapes(req.body);

  if (isMcpDiscovery(req, req.body)) {
    res.json(buildDiscoveryResponse());
    return;
  }

  // Claude-safe mode guard
  const auth = assertKeyOrClaudeSafeMode(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.message });
    return;
  }

  // Resolve tool alias chain: static Claude alias → database alias → canonical
  const callBody: any = req.body || {};
  const rawCallTool =
    callBody?.tool || callBody?.name || callBody?.params?.tool ||
    callBody?.params?.name || callBody?.input?.tool || callBody?.input?.name;
  const callResolution = await resolveToolName(
    typeof rawCallTool === "string" ? rawCallTool : ""
  );
  logToolResolution("post-call", callResolution);
  const callToolName = callResolution.resolved_tool;

  if (auth.mode === "claude_safe") {
    if (!callToolName || !CLAUDE_SAFE_TOOL_ALLOWLIST.has(callToolName)) {
      logToolBlocked("post-call", callResolution);
      res.status(403).json({
        error: "Tool not permitted in Claude-safe mode",
        tool: callToolName || null,
      });
      return;
    }
  }

  // Patch body with resolved canonical tool name so gate sees internal name
  if (callBody?.tool) callBody.tool = callToolName;
  if (callBody?.name) callBody.name = callToolName;
  if (callBody?.params?.tool) callBody.params.tool = callToolName;
  if (callBody?.params?.name) callBody.params.name = callToolName;
  if (callBody?.input?.tool) callBody.input.tool = callToolName;
  if (callBody?.input?.name) callBody.input.name = callToolName;

  // Inject target_user_id into inputs if missing
  if (callBody?.inputs && typeof callBody.inputs === "object") {
    callBody.inputs = withInjectedTargetUserId(callBody.inputs);
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
            requested_tool: tool,
            resolved_tool: tool,
            alias_hit: false,
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

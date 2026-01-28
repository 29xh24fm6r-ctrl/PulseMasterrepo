// transport/sse.ts
// SSE transport layer for MCP protocol — allows Claude.ai and Claude Desktop
// to connect via Server-Sent Events with JSON-RPC 2.0 messaging.

import type { Express, Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { OMEGA_ALLOWLIST } from "../omega-gate/allowlist.js";
import { executeGateTool } from "../omega-gate/executor.js";

// Active SSE transports keyed by session ID
const transports = new Map<string, SSEServerTransport>();

function createMcpServer(): Server {
  const server = new Server(
    { name: "pulse-mcp", version: "1.0" },
    { capabilities: { tools: {} } },
  );

  // tools/list — return all gate tools in MCP format
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.entries(OMEGA_ALLOWLIST).map(([name, entry]) => ({
      name,
      description: entry.description,
      inputSchema: { type: "object" as const, properties: {} },
    })),
  }));

  // tools/call — execute via gate executor
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.log("[pulse-mcp] SSE tools/call", { tool: name });

    try {
      const result = await executeGateTool({
        call_id: `mcp-${crypto.randomUUID()}`,
        tool: name,
        intent: `MCP tool call: ${name}`,
        inputs: (args ?? {}) as Record<string, unknown>,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    } catch (e: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              ok: false,
              error: e?.message ?? "Unknown error",
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

export function mountSseTransport(app: Express): void {
  // GET /sse — establish SSE connection
  app.get("/sse", async (req: Request, res: Response) => {
    console.log("[pulse-mcp] SSE connection request");

    const transport = new SSEServerTransport("/message", res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    console.log("[pulse-mcp] SSE session created", { sessionId });

    res.on("close", () => {
      console.log("[pulse-mcp] SSE session closed", { sessionId });
      transports.delete(sessionId);
    });

    const server = createMcpServer();
    await server.connect(transport);
  });

  // POST /message — receive JSON-RPC messages for an active SSE session
  app.post("/message", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "No active SSE session" });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handlePostMessage(req, res, req.body);
  });
}

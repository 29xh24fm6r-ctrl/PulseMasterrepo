// omega-gate/validation.ts
// Request + header validation for the Omega Gate.
// Enforces: key, agent, scope, nonce, timestamp drift, replay protection.

import { z } from "zod";
import type { Scope } from "./allowlist.js";
import { isAllowedTool, getToolEntry } from "./allowlist.js";

// ============================================
// HEADER SCHEMA
// ============================================

const VALID_AGENTS = ["claude", "gemini", "internal"] as const;
const VALID_SCOPES: Scope[] = ["read", "plan", "simulate", "propose", "execute"];
const MAX_TIMESTAMP_DRIFT_MS = 30_000; // 30 seconds

export interface GateHeaders {
  mcpKey: string;
  agent: string;
  scope: Scope;
  nonce: string;
  timestamp: number;
}

export function parseGateHeaders(
  headers: Record<string, string | undefined>,
  expectedKey: string
): GateHeaders {
  const mcpKey = headers["x-pulse-mcp-key"];
  if (!mcpKey || mcpKey !== expectedKey) {
    throw gateError(401, "Invalid or missing x-pulse-mcp-key");
  }

  const agent = headers["x-pulse-mcp-agent"];
  if (!agent || !VALID_AGENTS.includes(agent as any)) {
    throw gateError(400, `Invalid x-pulse-mcp-agent: ${agent}`);
  }

  const scopeHeader = headers["x-pulse-mcp-scope"];
  if (!scopeHeader || !VALID_SCOPES.includes(scopeHeader as Scope)) {
    throw gateError(400, `Invalid x-pulse-mcp-scope: ${scopeHeader}`);
  }

  const nonce = headers["x-pulse-nonce"];
  if (!nonce || nonce.length < 8) {
    throw gateError(400, "Missing or invalid x-pulse-nonce");
  }

  const tsHeader = headers["x-pulse-ts"];
  const timestamp = tsHeader ? Number(tsHeader) : NaN;
  if (isNaN(timestamp)) {
    throw gateError(400, "Missing or invalid x-pulse-ts");
  }

  const drift = Math.abs(Date.now() - timestamp);
  if (drift > MAX_TIMESTAMP_DRIFT_MS) {
    throw gateError(403, `Timestamp drift too large: ${drift}ms (max ${MAX_TIMESTAMP_DRIFT_MS}ms)`);
  }

  return {
    mcpKey,
    agent,
    scope: scopeHeader as Scope,
    nonce,
    timestamp,
  };
}

// ============================================
// REQUEST BODY SCHEMA
// ============================================

export const gateRequestSchema = z.object({
  call_id: z.string().min(8),
  tool: z.string().min(1),
  intent: z.string().min(1).max(500),
  inputs: z.record(z.unknown()).default({}),
});

export type GateRequest = z.infer<typeof gateRequestSchema>;

export function validateGateRequest(body: unknown): GateRequest {
  return gateRequestSchema.parse(body);
}

// ============================================
// SCOPE AUTHORIZATION
// ============================================

export function authorizeScope(tool: string, requestedScope: Scope): void {
  if (!isAllowedTool(tool)) {
    throw gateError(404, `Tool not in allowlist: ${tool}`);
  }

  const entry = getToolEntry(tool)!;
  if (!entry.scopes.includes(requestedScope)) {
    throw gateError(403, `Scope '${requestedScope}' not authorized for tool '${tool}'. Required: ${entry.scopes.join(", ")}`);
  }
}

// ============================================
// REPLAY GUARD (in-memory, TTL-based)
// ============================================

const NONCE_TTL_MS = 60_000; // 1 minute
const seenNonces = new Map<string, number>();

export function checkReplay(nonce: string): void {
  // Evict expired nonces
  const now = Date.now();
  for (const [key, ts] of seenNonces) {
    if (now - ts > NONCE_TTL_MS) {
      seenNonces.delete(key);
    }
  }

  if (seenNonces.has(nonce)) {
    throw gateError(409, "Replay detected: nonce already used");
  }

  seenNonces.set(nonce, now);
}

// ============================================
// ERROR HELPER
// ============================================

export function gateError(status: number, message: string): Error & { status: number; gate: true } {
  const e = new Error(message) as Error & { status: number; gate: true };
  e.status = status;
  e.gate = true;
  return e;
}

// omega-gate/index.ts
// The Omega Gate — single choke point for all external execution.
// Nothing enters Pulse Omega without passing through here.

import type { Request, Response } from "express";
import {
  parseGateHeaders,
  validateGateRequest,
  authorizeScope,
  checkReplay,
  gateError,
} from "./validation.js";
import { evaluateConfidence } from "./confidence.js";
import { recordEffectProposed, updateEffectCompleted } from "./effects.js";
import { getToolEntry, OMEGA_ALLOWLIST, isProposeTool } from "./allowlist.js";
import { executeGateTool } from "./executor.js";
import { persistProposal } from "./proposals.js";

/**
 * Handle an Omega Gate /call request.
 *
 * Flow:
 * 1. Parse + validate headers (key, agent, scope, nonce, timestamp)
 * 2. Check replay (nonce)
 * 3. Parse + validate request body (call_id, tool, intent, inputs)
 * 4. Authorize scope against allowlist
 * 5. Evaluate confidence
 * 6. Record effect (pre-flight)
 * 7. Execute or deny based on confidence verdict
 * 8. Update effect (post-execution)
 * 9. Return canonical response
 */
export async function handleGateCall(
  req: Request,
  res: Response,
  mcpApiKey: string
): Promise<void> {
  const startMs = Date.now();

  try {
    // 1. Validate headers
    const headers = parseGateHeaders(
      req.headers as Record<string, string | undefined>,
      mcpApiKey
    );

    // 2. Replay guard
    checkReplay(headers.nonce);

    // 3. Validate body
    const request = validateGateRequest(req.body);

    console.log("[omega-gate] call received", {
      call_id: request.call_id,
      tool: request.tool,
      agent: headers.agent,
      scope: headers.scope,
    });

    // 4. Authorize scope
    authorizeScope(request.tool, headers.scope);

    // 5. Evaluate confidence
    const confidence = evaluateConfidence(request);

    // 6. Record effect (pre-flight — always, before any execution)
    const effectId = await recordEffectProposed(headers, request, confidence);

    // 7. Route by verdict
    if (confidence.verdict === "deny") {
      console.log("[omega-gate] DENIED", {
        call_id: request.call_id,
        tool: request.tool,
        score: confidence.score,
        reason: confidence.reason,
      });

      res.status(403).json({
        call_id: request.call_id,
        status: "denied",
        confidence: confidence.score,
        result: {
          summary: `Denied: ${confidence.reason}`,
          artifacts: [],
        },
        audit_ref: effectId,
      });
      return;
    }

    if (confidence.verdict === "require_human") {
      console.log("[omega-gate] REQUIRES HUMAN", {
        call_id: request.call_id,
        tool: request.tool,
        score: confidence.score,
        reason: confidence.reason,
      });

      // For propose tools: generate proposal artifact and persist
      if (isProposeTool(request.tool)) {
        const result = await executeGateTool(request);
        const proposalId = await persistProposal(
          headers,
          request,
          effectId,
          result
        );

        await updateEffectCompleted(effectId, "require_human");

        console.log("[omega-gate] PROPOSAL CREATED", {
          call_id: request.call_id,
          tool: request.tool,
          proposal_id: proposalId,
        });

        res.status(202).json({
          call_id: request.call_id,
          status: "proposed",
          proposal_id: proposalId,
          confidence: confidence.score,
          result: {
            summary: result.summary,
            artifacts: result.artifacts,
          },
          audit_ref: effectId,
        });
        return;
      }

      // Non-propose tools: standard require_human response
      await updateEffectCompleted(effectId, "require_human");

      res.status(202).json({
        call_id: request.call_id,
        status: "proposed",
        confidence: confidence.score,
        result: {
          summary: `Requires human confirmation: ${confidence.reason}`,
          artifacts: [],
        },
        audit_ref: effectId,
      });
      return;
    }

    // 8. Execute (confidence >= 0.85, verdict === "allow")
    console.log("[omega-gate] EXECUTING", {
      call_id: request.call_id,
      tool: request.tool,
      score: confidence.score,
    });

    const result = await executeGateTool(request);

    await updateEffectCompleted(effectId, "executed", undefined, true);

    const durationMs = Date.now() - startMs;

    console.log("[omega-gate] COMPLETED", {
      call_id: request.call_id,
      tool: request.tool,
      durationMs,
    });

    res.status(200).json({
      call_id: request.call_id,
      status: "executed",
      confidence: confidence.score,
      result: {
        summary: result.summary,
        artifacts: result.artifacts,
      },
      audit_ref: effectId,
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    const isGateError = e?.gate === true;

    if (isGateError) {
      console.warn("[omega-gate] gate rejection", {
        status,
        message: e.message,
      });
    } else {
      console.error("[omega-gate] unexpected error", e);
    }

    res.status(status).json({
      call_id: req.body?.call_id ?? "unknown",
      status: "denied",
      confidence: 0,
      result: {
        summary: e?.message ?? "Internal gate error",
        artifacts: [],
      },
      audit_ref: null,
    });
  }
}

/**
 * List available tools (filtered by scope).
 */
export function listGateTools(): Array<{
  name: string;
  scopes: string[];
  effect: string;
  description: string;
}> {
  return Object.entries(OMEGA_ALLOWLIST).map(([name, entry]) => ({
    name,
    scopes: [...entry.scopes],
    effect: entry.effect,
    description: entry.description,
  }));
}

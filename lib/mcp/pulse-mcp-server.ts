/**
 * PULSE OMEGA MCP SERVER
 *
 * ============================================
 * SECURITY DECLARATION
 * ============================================
 *
 * This MCP server is OBSERVER-ONLY and PROPOSAL-GATED.
 *
 * - MCP has NO AUTHORITY to execute actions
 * - MCP has NO SERVICE ROLE ACCESS
 * - MCP can only READ Omega state (via anon key + optional viewer JWT)
 * - MCP can only PROPOSE improvements (queued for Guardian + human review)
 * - All outputs are ADVISORY only
 * - All operational actions must flow through /api/omega/* routes
 *
 * Guardian is authoritative. Autonomy is earned. Trust is verified.
 * ============================================
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  OMEGA_SCHEMA,
  ALLOWED_TABLES,
  GLOBAL_TABLES,
  MAX_QUERY_LIMIT,
  getSafeColumns,
  isGlobalTable,
  validateColumns,
} from "./omega-schema";

// ============================================
// TYPES
// ============================================

type ErrorCode =
  | "USER_ID_REQUIRED"
  | "TABLE_NOT_ALLOWED"
  | "COLUMN_NOT_ALLOWED"
  | "RATE_LIMIT"
  | "QUERY_FAILED"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR";

interface CanonEnvelope {
  _canon: {
    mode: "observer_only";
    authority: "none";
    write_paths: string[];
    timestamp: string;
  };
  result?: unknown;
  error?: {
    code: ErrorCode;
    message: string;
  };
}

// ============================================
// SECURITY: Use ANON key + optional viewer JWT
// ============================================

// Lazy client initialization (env vars may not be loaded at module import time)
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const viewerJwt = process.env.MCP_VIEWER_JWT;

  if (!url || !anonKey) {
    throw new Error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  if (viewerJwt) {
    // Authenticated viewer context for RLS
    _supabase = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${viewerJwt}`,
        },
      },
    });
  } else {
    // Fall back to anon key only
    console.error("[MCP WARNING] MCP_VIEWER_JWT not set; RLS may return empty results");
    _supabase = createClient(url, anonKey);
  }

  return _supabase;
}

// Getter for supabase client (lazy initialization)
const supabase = { get client() { return getSupabase(); } };

// ============================================
// CANONICAL RESPONSE HELPERS
// ============================================

function canonEnvelope(result: unknown): CanonEnvelope {
  return {
    _canon: {
      mode: "observer_only",
      authority: "none",
      write_paths: ["pulse_improvements:proposed_only"],
      timestamp: new Date().toISOString(),
    },
    result,
  };
}

function canonError(code: ErrorCode, message: string): CanonEnvelope {
  return {
    _canon: {
      mode: "observer_only",
      authority: "none",
      write_paths: ["pulse_improvements:proposed_only"],
      timestamp: new Date().toISOString(),
    },
    error: { code, message },
  };
}

function toToolResponse(envelope: CanonEnvelope) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(envelope, null, 2),
    }],
  };
}

// ============================================
// RATE LIMITING
// ============================================
const rateLimits: Map<string, { count: number; resetAt: number }> = new Map();
const RATE_LIMIT_PER_MINUTE = 30;

function checkRateLimit(toolName: string): boolean {
  const now = Date.now();
  const key = toolName;
  const limit = rateLimits.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  limit.count++;
  return true;
}

// ============================================
// AUDIT LOGGING
// ============================================
function auditLog(action: string, details: Record<string, unknown>, success: boolean) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "MCP_AUDIT",
    action,
    success,
    ...details,
  }));
}

// ============================================
// SAFE COLUMN HELPERS
// ============================================

function getSelectColumns(table: string, requestedSelect?: string): string {
  const safeColumns = getSafeColumns(table);
  if (!safeColumns) return "*"; // Table not in schema, use default

  if (!requestedSelect || requestedSelect === "*") {
    return safeColumns.join(",");
  }

  // Validate requested columns
  const requested = requestedSelect.split(",").map(c => c.trim());
  const validation = validateColumns(table, requested);

  if (!validation.valid) {
    throw new Error(`Columns not allowed: ${validation.invalid.join(", ")}`);
  }

  return requestedSelect;
}

function validateFilterColumns(table: string, filters: Record<string, unknown>): void {
  const safeColumns = getSafeColumns(table);
  if (!safeColumns) return;

  const filterKeys = Object.keys(filters);
  const validation = validateColumns(table, filterKeys);

  if (!validation.valid) {
    throw new Error(`Filter columns not allowed: ${validation.invalid.join(", ")}`);
  }
}

// ============================================
// SERVER SETUP
// ============================================
const server = new Server(
  {
    name: "pulse-omega-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================
// RESOURCES - Read-only access to Omega state
// ============================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  auditLog("list_resources", {}, true);

  return {
    resources: [
      {
        uri: "omega://schema",
        name: "Omega Database Schema",
        description: "Complete database schema for all Omega tables (static snapshot). Use omega_get_state tool for user-specific data.",
        mimeType: "application/json",
      },
      {
        uri: "omega://constraints",
        name: "Guardian Constraints",
        description: "Global safety constraints (not user-scoped)",
        mimeType: "application/json",
      },
      {
        uri: "omega://autonomy-levels",
        name: "Autonomy Level Definitions",
        description: "Global autonomy level definitions (not user-scoped)",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  auditLog("read_resource", { uri }, true);

  try {
    switch (uri) {
      case "omega://schema": {
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(canonEnvelope({
              schema: OMEGA_SCHEMA,
              allowedTables: ALLOWED_TABLES,
              globalTables: GLOBAL_TABLES,
              maxQueryLimit: MAX_QUERY_LIMIT,
              note: "Use omega_get_state, omega_health_report, etc. tools with userId for user-specific data",
            }), null, 2),
          }],
        };
      }

      case "omega://constraints": {
        // Global table - no userId required
        const { data, error } = await supabase
          .from("pulse_constraints")
          .select(getSafeColumns("pulse_constraints")?.join(",") || "*")
          .order("constraint_type");

        if (error) {
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify(canonError("QUERY_FAILED", error.message), null, 2),
            }],
          };
        }

        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(canonEnvelope({ constraints: data }), null, 2),
          }],
        };
      }

      case "omega://autonomy-levels": {
        // Global table - no userId required
        const { data, error } = await supabase
          .from("pulse_autonomy_levels")
          .select(getSafeColumns("pulse_autonomy_levels")?.join(",") || "*")
          .order("level");

        if (error) {
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify(canonError("QUERY_FAILED", error.message), null, 2),
            }],
          };
        }

        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(canonEnvelope({ autonomyLevels: data }), null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    auditLog("read_resource", { uri, error: String(error) }, false);
    throw error;
  }
});

// ============================================
// TOOLS - Observe and Propose (NO EXECUTION)
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  auditLog("list_tools", {}, true);

  return {
    tools: [
      // ========== OBSERVATION TOOLS ==========
      {
        name: "omega_query",
        description: "Query Omega tables (READ-ONLY, allowlisted tables only, max 200 rows, safeColumns enforced)",
        inputSchema: {
          type: "object" as const,
          properties: {
            table: {
              type: "string",
              description: `Table name. Allowed: ${ALLOWED_TABLES.join(", ")}`,
              enum: ALLOWED_TABLES,
            },
            userId: {
              type: "string",
              description: "User ID (REQUIRED for user-scoped tables)",
            },
            select: {
              type: "string",
              description: "Columns to select (default: safeColumns for table)",
            },
            filters: {
              type: "object",
              description: "Key-value filters to apply (safeColumns only)",
            },
            limit: {
              type: "number",
              description: `Maximum rows (default: 50, max: ${MAX_QUERY_LIMIT})`,
            },
            orderBy: {
              type: "string",
              description: "Column to order by (must be in safeColumns)",
            },
            ascending: {
              type: "boolean",
              description: "Sort ascending (default: false)",
            },
          },
          required: ["table"],
        },
      },
      {
        name: "omega_get_state",
        description: "Get current Omega state for a user: pending drafts, active goals, recent signals",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "User ID (REQUIRED)",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "omega_health_report",
        description: "Generate a health report: pending drafts, violations, calibration, autonomy, recent signals",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "User ID (REQUIRED)",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "omega_risk_report",
        description: "Generate a risk report: repeated failures, volatility, constraint trends, autonomy recommendations",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "User ID (REQUIRED)",
            },
            lookbackHours: {
              type: "number",
              description: "Hours to look back (default: 24)",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "omega_analyze_calibration",
        description: "Analyze confidence calibration and identify accuracy issues",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "User ID (REQUIRED)",
            },
            node: {
              type: "string",
              description: "Specific node to analyze (optional)",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "omega_get_reasoning_chain",
        description: "Get the full reasoning chain for a specific session",
        inputSchema: {
          type: "object" as const,
          properties: {
            sessionId: {
              type: "string",
              description: "Session ID to retrieve",
            },
            userId: {
              type: "string",
              description: "User ID (REQUIRED for RLS)",
            },
          },
          required: ["sessionId", "userId"],
        },
      },
      // ========== PROPOSAL TOOL (ONLY WRITE PATH) ==========
      {
        name: "omega_propose_improvement",
        description: "Propose an improvement to Omega (QUEUED FOR HUMAN REVIEW - does not execute)",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "User ID who this improvement is for (REQUIRED)",
            },
            improvementType: {
              type: "string",
              enum: ["prompt_adjustment", "strategy_update", "threshold_change", "new_pattern", "schema_change", "code_change"],
              description: "Type of improvement",
            },
            targetComponent: {
              type: "string",
              description: "What component this affects",
            },
            currentState: {
              type: "object",
              description: "Current state of the component (optional)",
            },
            proposedChange: {
              type: "object",
              description: "Proposed new state or change",
            },
            expectedImpact: {
              type: "string",
              description: "Expected impact of this change",
            },
            implementation: {
              type: "string",
              description: "Code or migration to implement (for human review)",
            },
            risk: {
              type: "string",
              description: "Potential risks of this change",
            },
          },
          required: ["userId", "improvementType", "targetComponent", "proposedChange", "expectedImpact"],
        },
      },
      // ========== ANALYSIS TOOL (LOCAL COMPUTATION) ==========
      {
        name: "omega_simulate_impact",
        description: "Analyze potential impact of a change (local computation only, does not modify anything)",
        inputSchema: {
          type: "object" as const,
          properties: {
            changeDescription: {
              type: "string",
              description: "Description of the proposed change",
            },
            affectedComponents: {
              type: "array",
              items: { type: "string" },
              description: "Components that would be affected",
            },
          },
          required: ["changeDescription"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const typedArgs = args as Record<string, unknown>;

  // Rate limiting
  if (!checkRateLimit(name)) {
    auditLog(name, { args: typedArgs, rateLimited: true }, false);
    return toToolResponse(canonError("RATE_LIMIT", `Rate limit exceeded for ${name}. Please wait before retrying.`));
  }

  try {
    switch (name) {
      // ========== OBSERVATION TOOLS ==========

      case "omega_query": {
        const table = typedArgs.table as string;
        const userId = typedArgs.userId as string | undefined;
        const requestedSelect = typedArgs.select as string | undefined;
        const filters = typedArgs.filters as Record<string, unknown> | undefined;
        const limit = typedArgs.limit as number | undefined;
        const orderBy = typedArgs.orderBy as string | undefined;
        const ascending = typedArgs.ascending as boolean | undefined;

        // Validate table is in allowlist
        if (!ALLOWED_TABLES.includes(table)) {
          auditLog(name, { table, error: "Table not allowed" }, false);
          return toToolResponse(canonError("TABLE_NOT_ALLOWED", `Table "${table}" is not in the allowlist.`));
        }

        // Require userId for non-global tables
        if (!isGlobalTable(table) && !userId) {
          auditLog(name, { table, error: "userId required" }, false);
          return toToolResponse(canonError("USER_ID_REQUIRED", `userId is required for table "${table}" (not a global table)`));
        }

        // Get safe columns for select
        let selectColumns: string;
        try {
          selectColumns = getSelectColumns(table, requestedSelect);
        } catch (err) {
          auditLog(name, { table, error: String(err) }, false);
          return toToolResponse(canonError("COLUMN_NOT_ALLOWED", String(err)));
        }

        // Validate filter columns
        if (filters) {
          try {
            validateFilterColumns(table, filters);
          } catch (err) {
            auditLog(name, { table, error: String(err) }, false);
            return toToolResponse(canonError("COLUMN_NOT_ALLOWED", String(err)));
          }
        }

        // Enforce max limit
        const effectiveLimit = Math.min(limit || 50, MAX_QUERY_LIMIT);

        let query = supabase.client.from(table).select(selectColumns);

        // Add userId filter for non-global tables
        if (!isGlobalTable(table) && userId) {
          query = query.eq("user_id", userId);
        }

        // Add additional filters
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }

        // Validate orderBy column
        if (orderBy) {
          const safeColumns = getSafeColumns(table);
          if (safeColumns && !safeColumns.includes(orderBy)) {
            return toToolResponse(canonError("COLUMN_NOT_ALLOWED", `orderBy column "${orderBy}" not in safeColumns`));
          }
          query = query.order(orderBy, { ascending: ascending ?? false });
        }

        query = query.limit(effectiveLimit);

        const { data, error } = await query;

        if (error) {
          auditLog(name, { table, error: error.message }, false);
          return toToolResponse(canonError("QUERY_FAILED", error.message));
        }

        auditLog(name, { table, userId, rowsReturned: data?.length || 0 }, true);

        return toToolResponse(canonEnvelope({
          table,
          userId: userId || null,
          rowCount: data?.length || 0,
          data,
        }));
      }

      case "omega_get_state": {
        const userId = typedArgs.userId as string;

        if (!userId) {
          auditLog(name, { error: "userId required" }, false);
          return toToolResponse(canonError("USER_ID_REQUIRED", "userId is required"));
        }

        const [signals, drafts, goals, intents] = await Promise.all([
          supabase.client.from("pulse_signals").select(getSafeColumns("pulse_signals")?.join(",") || "*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
          supabase.client.from("pulse_drafts").select(getSafeColumns("pulse_drafts")?.join(",") || "*").eq("user_id", userId).eq("status", "pending_review").order("created_at", { ascending: false }).limit(50),
          supabase.client.from("pulse_goals").select(getSafeColumns("pulse_goals")?.join(",") || "*").eq("user_id", userId).eq("status", "active").limit(50),
          supabase.client.from("pulse_intents").select(getSafeColumns("pulse_intents")?.join(",") || "*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        ]);

        auditLog(name, { userId }, true);

        return toToolResponse(canonEnvelope({
          userId,
          recentSignals: signals.data,
          pendingDrafts: drafts.data,
          activeGoals: goals.data,
          recentIntents: intents.data,
        }));
      }

      case "omega_health_report": {
        const userId = typedArgs.userId as string;

        if (!userId) {
          auditLog(name, { error: "userId required" }, false);
          return toToolResponse(canonError("USER_ID_REQUIRED", "userId is required"));
        }

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [drafts, violations, calibration, autonomy, signals] = await Promise.all([
          supabase.client.from("pulse_drafts").select("id, status").eq("user_id", userId).eq("status", "pending_review"),
          supabase.client.from("pulse_constraint_violations").select(getSafeColumns("pulse_constraint_violations")?.join(",") || "*").eq("user_id", userId).gte("created_at", yesterday.toISOString()),
          supabase.client.from("pulse_confidence_calibration").select("*").eq("user_id", userId),
          supabase.client.from("pulse_user_autonomy").select(getSafeColumns("pulse_user_autonomy")?.join(",") || "*").eq("user_id", userId).single(),
          supabase.client.from("pulse_signals").select(getSafeColumns("pulse_signals")?.join(",") || "*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        ]);

        // Calculate average calibration gap
        const avgCalibrationGap = calibration.data?.length
          ? calibration.data.reduce((sum, c) => sum + ((c.calibration_gap as number) || 0), 0) / calibration.data.length
          : null;

        const report = {
          userId,
          timestamp: now.toISOString(),
          summary: {
            pendingDraftsCount: drafts.data?.length || 0,
            violationsLast24h: violations.data?.length || 0,
            avgCalibrationGap: avgCalibrationGap?.toFixed(3) || "N/A",
            calibrationStatus: avgCalibrationGap === null ? "No data" :
                              Math.abs(avgCalibrationGap) < 0.1 ? "Well calibrated" :
                              avgCalibrationGap > 0 ? "Overconfident" : "Underconfident",
          },
          autonomy: autonomy.data ? {
            level: autonomy.data.current_level,
            reason: autonomy.data.level_reason,
            calibrationScore: autonomy.data.calibration_score,
          } : null,
          recentSignals: signals.data?.map(s => ({
            id: s.id,
            source: s.source,
            type: s.signal_type,
            processed: s.processed,
            createdAt: s.created_at,
          })),
        };

        auditLog(name, { userId }, true);

        return toToolResponse(canonEnvelope(report));
      }

      case "omega_risk_report": {
        const userId = typedArgs.userId as string;
        const lookbackHours = (typedArgs.lookbackHours as number) || 24;

        if (!userId) {
          auditLog(name, { error: "userId required" }, false);
          return toToolResponse(canonError("USER_ID_REQUIRED", "userId is required"));
        }

        const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
        const dataNotes: string[] = [];

        // Query failures - defensive to column shape
        const [failures, violations, traces] = await Promise.all([
          supabase.client.from("pulse_drafts").select(getSafeColumns("pulse_drafts")?.join(",") || "*").eq("user_id", userId).eq("status", "rejected").gte("created_at", since.toISOString()),
          supabase.client.from("pulse_constraint_violations").select(getSafeColumns("pulse_constraint_violations")?.join(",") || "*").eq("user_id", userId).gte("created_at", since.toISOString()),
          supabase.client.from("pulse_reasoning_traces").select(getSafeColumns("pulse_reasoning_traces")?.join(",") || "*").eq("user_id", userId).eq("success", false).gte("created_at", since.toISOString()),
        ]);

        // Defensive outcomes query - check for measured_at vs created_at
        let outcomes: { data: unknown[] | null; error: unknown } = { data: null, error: null };
        try {
          // Try measured_at first
          outcomes = await supabase.client.from("pulse_outcomes")
            .select(getSafeColumns("pulse_outcomes")?.join(",") || "*")
            .eq("user_id", userId)
            .gte("measured_at", since.toISOString());

          // Check if we got data or if column doesn't exist
          if (outcomes.error) {
            // Fallback to created_at
            outcomes = await supabase.client.from("pulse_outcomes")
              .select(getSafeColumns("pulse_outcomes")?.join(",") || "*")
              .eq("user_id", userId)
              .gte("created_at", since.toISOString());
            dataNotes.push("Using created_at instead of measured_at for outcomes");
          }
        } catch {
          dataNotes.push("Could not query outcomes table");
        }

        // Detect failures in outcomes - defensive approach
        let failedOutcomesCount = 0;
        if (outcomes.data && Array.isArray(outcomes.data)) {
          failedOutcomesCount = outcomes.data.filter((o: Record<string, unknown>) => {
            // Try outcome_type = "failure" first
            if (o.outcome_type === "failure") return true;
            // Fallback: check user_rating <= 2
            if (typeof o.user_rating === "number" && o.user_rating <= 2) return true;
            return false;
          }).length;
        }

        // Analyze patterns
        const failuresByType: Record<string, number> = {};
        failures.data?.forEach(f => {
          const draftType = (f as Record<string, unknown>).draft_type as string;
          if (draftType) {
            failuresByType[draftType] = (failuresByType[draftType] || 0) + 1;
          }
        });

        const violationsByConstraint: Record<string, number> = {};
        violations.data?.forEach(v => {
          const constraintId = (v as Record<string, unknown>).constraint_id as string;
          if (constraintId) {
            violationsByConstraint[constraintId] = (violationsByConstraint[constraintId] || 0) + 1;
          }
        });

        const risks: string[] = [];
        const recommendations: string[] = [];

        if ((failures.data?.length || 0) > 5) {
          risks.push(`High rejection rate: ${failures.data?.length} drafts rejected in ${lookbackHours}h`);
          recommendations.push("Review draft generation prompts and confidence thresholds");
        }

        if ((violations.data?.length || 0) > 3) {
          risks.push(`Constraint violations: ${violations.data?.length} in ${lookbackHours}h`);
          recommendations.push("Review Guardian constraints and user autonomy levels");
        }

        if ((traces.data?.length || 0) > 10) {
          risks.push(`Reasoning failures: ${traces.data?.length} failed traces in ${lookbackHours}h`);
          recommendations.push("Investigate reasoning trace failures for patterns");
        }

        const report = {
          userId,
          timestamp: new Date().toISOString(),
          lookbackHours,
          metrics: {
            rejectedDrafts: failures.data?.length || 0,
            constraintViolations: violations.data?.length || 0,
            failedOutcomes: failedOutcomesCount,
            failedTraces: traces.data?.length || 0,
          },
          patterns: {
            failuresByDraftType: failuresByType,
            violationsByConstraint: violationsByConstraint,
          },
          risks,
          recommendations,
          autonomyRecommendation: risks.length > 2 ? "Consider reducing autonomy level" : "Current autonomy level appears appropriate",
          dataNotes: dataNotes.length > 0 ? dataNotes : undefined,
        };

        auditLog(name, { userId, lookbackHours }, true);

        return toToolResponse(canonEnvelope(report));
      }

      case "omega_analyze_calibration": {
        const userId = typedArgs.userId as string;
        const node = typedArgs.node as string | undefined;

        if (!userId) {
          auditLog(name, { error: "userId required" }, false);
          return toToolResponse(canonError("USER_ID_REQUIRED", "userId is required"));
        }

        let query = supabase.client.from("pulse_confidence_calibration").select("*").eq("user_id", userId);

        if (node) {
          query = query.eq("node", node);
        }

        const { data } = await query;

        // Calculate analysis
        const analysis = {
          userId,
          node: node || "all",
          calibrationData: data,
          summary: {
            totalBuckets: data?.length || 0,
            averageCalibrationGap: data?.length
              ? (data.reduce((sum, d) => sum + ((d.calibration_gap as number) || 0), 0) / data.length).toFixed(3)
              : "N/A",
            worstBucket: data?.sort((a, b) => Math.abs((b.calibration_gap as number) || 0) - Math.abs((a.calibration_gap as number) || 0))[0],
            bestBucket: data?.sort((a, b) => Math.abs((a.calibration_gap as number) || 0) - Math.abs((b.calibration_gap as number) || 0))[0],
          },
          recommendations: [] as string[],
        };

        // Generate recommendations
        const avgGap = data?.length
          ? data.reduce((sum, d) => sum + ((d.calibration_gap as number) || 0), 0) / data.length
          : 0;

        if (avgGap > 0.1) {
          analysis.recommendations.push("System is overconfident. Consider reducing confidence scores by ~10%.");
        } else if (avgGap < -0.1) {
          analysis.recommendations.push("System is underconfident. Consider increasing confidence scores.");
        } else {
          analysis.recommendations.push("Calibration is within acceptable range.");
        }

        auditLog(name, { userId, node }, true);

        return toToolResponse(canonEnvelope(analysis));
      }

      case "omega_get_reasoning_chain": {
        const sessionId = typedArgs.sessionId as string;
        const userId = typedArgs.userId as string;

        if (!sessionId) {
          auditLog(name, { error: "sessionId required" }, false);
          return toToolResponse(canonError("INVALID_INPUT", "sessionId is required"));
        }

        if (!userId) {
          auditLog(name, { error: "userId required" }, false);
          return toToolResponse(canonError("USER_ID_REQUIRED", "userId is required for RLS"));
        }

        const { data: traces } = await supabase
          .from("pulse_reasoning_traces")
          .select(getSafeColumns("pulse_reasoning_traces")?.join(",") || "*")
          .eq("session_id", sessionId)
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        auditLog(name, { sessionId, userId, tracesFound: traces?.length || 0 }, true);

        return toToolResponse(canonEnvelope({
          sessionId,
          userId,
          traceCount: traces?.length || 0,
          traces,
        }));
      }

      // ========== PROPOSAL TOOL (ONLY WRITE PATH) ==========

      case "omega_propose_improvement": {
        const userId = typedArgs.userId as string;

        if (!userId) {
          auditLog(name, { error: "userId required" }, false);
          return toToolResponse(canonError("USER_ID_REQUIRED", "userId is required for improvement proposals"));
        }

        // This is the ONLY write operation MCP can perform
        // It creates a proposal that MUST be reviewed by Guardian + human
        const { data, error } = await supabase
          .from("pulse_improvements")
          .insert({
            user_id: userId, // Real user ID, not hardcoded
            improvement_type: typedArgs.improvementType,
            target_component: typedArgs.targetComponent,
            current_state: typedArgs.currentState || {},
            proposed_change: typedArgs.proposedChange,
            expected_impact: typedArgs.expectedImpact,
            status: "proposed", // ALWAYS proposed, never auto-applied
            guardian_review: {
              proposed_by: "mcp_external_llm",
              source: "mcp",
              proposed_at: new Date().toISOString(),
              implementation: typedArgs.implementation || null,
              risk: typedArgs.risk || "Not specified",
              requires_human_approval: true,
            },
          })
          .select("id, user_id, improvement_type, target_component, status, created_at")
          .single();

        if (error) {
          auditLog(name, { userId, error: error.message }, false);
          return toToolResponse(canonError("QUERY_FAILED", error.message));
        }

        auditLog(name, { improvementId: data.id, userId, type: typedArgs.improvementType }, true);

        return toToolResponse(canonEnvelope({
          status: "PROPOSED",
          improvementId: data.id,
          userId: data.user_id,
          type: data.improvement_type,
          target: data.target_component,
          message: "Improvement queued for Guardian + human review. MCP has no authority to execute changes directly.",
          reviewRequired: true,
        }));
      }

      // ========== ANALYSIS TOOL (LOCAL COMPUTATION) ==========

      case "omega_simulate_impact": {
        const changeDescription = typedArgs.changeDescription as string;
        const affectedComponents = typedArgs.affectedComponents as string[] | undefined;

        // Pure analysis, no database writes
        const impact = {
          changeDescription,
          affectedComponents: affectedComponents || [],
          analysis: {
            estimatedScope: (affectedComponents?.length || 0) > 3 ? "Large" :
                           (affectedComponents?.length || 0) > 1 ? "Medium" : "Small",
            riskLevel: changeDescription.toLowerCase().includes("delete") ||
                       changeDescription.toLowerCase().includes("remove") ? "High" :
                       changeDescription.toLowerCase().includes("modify") ? "Medium" : "Low",
          },
          recommendation: "Submit via omega_propose_improvement for Guardian + human review",
        };

        auditLog(name, { changeDescription }, true);

        return toToolResponse(canonEnvelope(impact));
      }

      default:
        auditLog(name, { error: "Unknown tool" }, false);
        return toToolResponse(canonError("INVALID_INPUT", `Unknown tool: ${name}`));
    }
  } catch (error) {
    auditLog(name, { args: typedArgs, error: String(error) }, false);
    return toToolResponse(canonError("INTERNAL_ERROR", String(error)));
  }
});

// ============================================
// START SERVER
// ============================================
export async function startMcpServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("============================================");
  console.error("PULSE OMEGA MCP SERVER");
  console.error("============================================");
  console.error("Mode: OBSERVER-ONLY, PROPOSAL-GATED");
  console.error("Authority: NONE (advisory only)");
  console.error("Write access: pulse_improvements (proposals only)");
  console.error("JWT Auth: " + (process.env.MCP_VIEWER_JWT ? "ENABLED" : "DISABLED (RLS may return empty)"));
  console.error("============================================");
}

// Run if executed directly
startMcpServer().catch((err) => {
  console.error("[PulseOmegaMCP] Fatal error:", err);
  process.exit(1);
});

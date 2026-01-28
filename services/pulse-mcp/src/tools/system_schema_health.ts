// tools/system_schema_health.ts
// Self-diagnostic: detect missing tables, disabled RLS, missing canon policies.
// Never throws — always returns structured status.

import { getSupabase } from "../supabase.js";

const REQUIRED_TABLES = [
  "pulse_trust_state",
  "pulse_memory_events",
  "pulse_decisions",
  "pulse_trigger_candidates",
  "pulse_tool_aliases",
  "pulse_observer_events",
  "pulse_agent_registry",
];

// Canon policy names that must exist on every table
const CANON_POLICIES = {
  anchor: "pulse_user_owns_row",
  service: "service_role_all",
};

export interface TableHealth {
  table: string;
  exists: boolean;
  rls: boolean;
  has_anchor: boolean;
  has_service_role: boolean;
  policies: string[];
  status: "ok" | "error";
}

export async function systemSchemaHealth(): Promise<{
  summary: string;
  tables: TableHealth[];
}> {
  const supabase = getSupabase();
  const tables: TableHealth[] = [];

  for (const table of REQUIRED_TABLES) {
    try {
      const [existsResult, rlsResult, policiesResult] = await Promise.all([
        supabase.rpc("table_exists", { tbl: table }),
        supabase.rpc("table_rls_enabled", { tbl: table }),
        supabase.rpc("table_policies", { tbl: table }),
      ]);

      const exists = existsResult.data === true;
      const rls = rlsResult.data === true;
      const policies: string[] = Array.isArray(policiesResult.data)
        ? policiesResult.data
        : [];

      const has_anchor = policies.includes(CANON_POLICIES.anchor);
      const has_service_role = policies.includes(CANON_POLICIES.service);

      tables.push({
        table,
        exists,
        rls,
        has_anchor,
        has_service_role,
        policies,
        status: exists && rls && has_anchor && has_service_role ? "ok" : "error",
      });
    } catch {
      // Table check failed entirely — report as error, never throw
      tables.push({
        table,
        exists: false,
        rls: false,
        has_anchor: false,
        has_service_role: false,
        policies: [],
        status: "error",
      });
    }
  }

  const allOk = tables.every((t) => t.status === "ok");

  return {
    summary: allOk ? "Schema healthy" : "Schema issues detected",
    tables,
  };
}

// lib/features/canaries/intel.canary.ts
import "server-only";
import type { CanaryFn, CanaryContext, CanaryResult } from "../canary.types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hintMissingTable, hintRlsDenied, hintApiDown } from "../canary/hints";

export const intelCanary: CanaryFn = async (ctx: CanaryContext): Promise<CanaryResult> => {
  const checks: CanaryResult["checks"] = [];
  const featureId = "life-intelligence";

  // Check 1: API endpoint reachable (check intel endpoint)
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/intelligence/gather`, {
      method: "HEAD",
      headers: { "Content-Type": "application/json" },
    });
    const apiOk = response.status < 500;
    checks.push({
      id: "api_reachable",
      label: "API endpoint reachable",
      ok: apiOk,
      details: apiOk ? "GET /api/intelligence/gather responds" : `HTTP ${response.status}`,
      fixHint: apiOk ? undefined : hintApiDown("/api/intelligence/gather"),
    });
  } catch (err: any) {
    checks.push({
      id: "api_reachable",
      label: "API endpoint reachable",
      ok: false,
      details: err?.message || "Failed to reach API",
      fixHint: hintApiDown("/api/intelligence/gather"),
    });
  }

  // Check 2: DB table exists (check contact_intelligence or similar)
  try {
    const { error } = await supabaseAdmin.from("contact_intelligence").select("id").limit(1);
    const tableOk = !error;
    const isMissingTable = error?.code === "42P01" || error?.message?.includes("does not exist");
    checks.push({
      id: "db_table_exists",
      label: "Database table accessible",
      ok: tableOk,
      details: tableOk ? "contact_intelligence table exists and is queryable" : error?.message,
      fixHint: tableOk ? undefined : isMissingTable ? hintMissingTable("contact_intelligence") : hintRlsDenied("contact_intelligence"),
    });
  } catch (err: any) {
    checks.push({
      id: "db_table_exists",
      label: "Database table accessible",
      ok: false,
      details: err?.message || "Failed to query contact_intelligence table",
      fixHint: hintMissingTable("contact_intelligence"),
    });
  }

  const ok = checks.every((c) => c.ok);
  const severity = ok ? "ok" : checks.some((c) => !c.ok) ? "fail" : "warn";
  return {
    featureId,
    ok,
    severity,
    checks,
    createdAt: new Date().toISOString(),
    message: ok ? "All checks passed" : `${checks.filter((c) => !c.ok).length} check(s) failed`,
  };
};


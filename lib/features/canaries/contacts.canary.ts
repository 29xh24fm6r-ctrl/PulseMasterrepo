// lib/features/canaries/contacts.canary.ts
import "server-only";
import type { CanaryFn, CanaryContext, CanaryResult } from "../canary.types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hintMissingTable, hintRlsDenied, hintApiDown } from "../canary/hints";

export const contactsCanary: CanaryFn = async (ctx: CanaryContext): Promise<CanaryResult> => {
  const checks: CanaryResult["checks"] = [];
  const featureId = "contacts";

  // Check 1: API endpoint reachable
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/contacts`, {
      method: "HEAD",
      headers: { "Content-Type": "application/json" },
    });
    const apiOk = response.status < 500;
    checks.push({
      id: "api_reachable",
      label: "API endpoint reachable",
      ok: apiOk,
      details: apiOk ? "GET /api/contacts responds" : `HTTP ${response.status}`,
      fixHint: apiOk ? undefined : hintApiDown("/api/contacts"),
    });
  } catch (err: any) {
    checks.push({
      id: "api_reachable",
      label: "API endpoint reachable",
      ok: false,
      details: err?.message || "Failed to reach API",
      fixHint: hintApiDown("/api/contacts"),
    });
  }

  // Check 2: DB table exists + select works
  try {
    const { error } = await supabaseAdmin.from("contacts").select("id").limit(1);
    const tableOk = !error;
    // Check if error suggests missing table (common Supabase error codes)
    const isMissingTable = error?.code === "42P01" || error?.message?.includes("does not exist");
    checks.push({
      id: "db_table_exists",
      label: "Database table accessible",
      ok: tableOk,
      details: tableOk ? "contacts table exists and is queryable" : error?.message,
      fixHint: tableOk ? undefined : isMissingTable ? hintMissingTable("contacts") : hintRlsDenied("contacts"),
    });
  } catch (err: any) {
    checks.push({
      id: "db_table_exists",
      label: "Database table accessible",
      ok: false,
      details: err?.message || "Failed to query contacts table",
      fixHint: hintMissingTable("contacts"),
    });
  }

  // Check 3: RLS structure
  try {
    const { data, error } = await supabaseAdmin.from("contacts").select("id, user_id").limit(1);
    const rlsOk = !error && (!data || data.length === 0 || data[0]?.user_id);
    checks.push({
      id: "rls_structure",
      label: "RLS structure valid",
      ok: rlsOk,
      details: rlsOk ? "contacts.user_id column present" : error?.message || "Missing user_id column",
      fixHint: rlsOk ? undefined : hintRlsDenied("contacts"),
    });
  } catch (err: any) {
    checks.push({
      id: "rls_structure",
      label: "RLS structure valid",
      ok: false,
      details: err?.message || "Failed to verify RLS structure",
      fixHint: hintRlsDenied("contacts"),
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


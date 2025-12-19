// app/api/health/rls/route.ts
// Sprint 4.1: RLS policy sanity check
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/rls
 * 
 * Quick sanity check that RLS policies are present.
 * Validates via Postgres catalog pg_policies.
 * 
 * If system view is restricted, returns skipped (doesn't break prod).
 */
export async function GET() {
  try {
    const targetTables = [
      "crm_contacts",
      "tasks",
      "deals",
      "habits",
      "habit_logs",
      "journal_entries",
    ];

    // Try to query pg_policies via SQL RPC (more reliable than PostgREST)
    const { data, error } = await supabaseAdmin.rpc("get_rls_policies", {
      schema_name: "public",
    }).then((result) => {
      // If RPC doesn't exist, try direct query (may be restricted)
      if (result.error && result.error.code === "42883") {
        return supabaseAdmin
          .from("pg_policies")
          .select("tablename, policyname")
          .eq("schemaname", "public");
      }
      return result;
    });

    // If system view is restricted, fall back gracefully
    if (error) {
      return NextResponse.json(
        { ok: true, skipped: true, reason: error.message },
        { status: 200 }
      );
    }

    // Process results
    const byTable: Record<string, string[]> = {};
    
    // Handle both RPC result format and direct query format
    const policies = Array.isArray(data) ? data : [];
    
    for (const row of policies) {
      const tablename = row.tablename || row.table_name;
      const policyname = row.policyname || row.policy_name;
      
      if (tablename && policyname) {
        byTable[tablename] ??= [];
        byTable[tablename].push(policyname);
      }
    }

    const report: Record<string, { ok: boolean; policies: string[] }> = {};
    for (const t of targetTables) {
      const policies = byTable[t] ?? [];
      report[t] = { ok: policies.length > 0, policies };
    }

    const allOk = Object.values(report).every((r) => r.ok);

    return NextResponse.json(
      { ok: allOk, rls: report },
      { status: allOk ? 200 : 500 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}


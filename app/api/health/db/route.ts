// app/api/health/db/route.ts
// Sprint 4.1: Database health check endpoint (real DB probe)
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export const dynamic = "force-dynamic";

type TableProbe = {
  ok: boolean;
  error?: string;
};

async function probeTable(table: string, userId: string): Promise<TableProbe> {
  try {
    const { error } = await supabaseAdmin
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/**
 * GET /api/health/db
 * 
 * Verifies:
 * - Auth resolver works
 * - Supabase admin client works
 * - Core tables are accessible with user_id filtering
 * 
 * Returns fast JSON suitable for production heartbeat.
 */
export async function GET() {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "GET /api/health/db" });

  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const tables = [
      "crm_contacts",
      "tasks",
      "deals",
      "habits",
      "habit_logs",
      "journal_entries",
    ] as const;

    const results: Record<string, TableProbe> = {};
    for (const t of tables) {
      results[t] = await probeTable(t, supabaseUserId);
    }

    const allOk = Object.values(results).every((r) => r.ok);

    log.info("route.ok", { ...meta, route: "GET /api/health/db", ms: Date.now() - t0, allOk });
    return NextResponse.json(
      {
        ok: allOk,
        supabaseUserId,
        tables: results,
      },
      { status: allOk ? 200 : 500 }
    );
  } catch (e: any) {
    log.error("route.err", { ...meta, route: "GET /api/health/db", ms: Date.now() - t0, error: e?.message || String(e) });
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

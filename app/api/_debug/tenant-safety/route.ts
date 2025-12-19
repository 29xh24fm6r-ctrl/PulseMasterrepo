// TEMPORARY DEBUG ENDPOINT - DELETE AFTER VALIDATION
// This endpoint tests tenant isolation across critical tables
// app/api/_debug/tenant-safety/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, jsonError } from "@/lib/api/routeErrors";

export async function GET() {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    // Pick a handful of high-risk tables you KNOW exist
    const tables = [
      "crm_contacts",
      "crm_deals",
      "crm_interactions",
      "crm_organizations",
      "crm_tasks",
      "email_threads",
      "calendar_events_cache",
      "memories",
      "tb_nodes",
      "knowledge_nodes",
      "tasks",
      "deals",
      "contacts",
      "journal_entries",
      "habits",
      "follow_ups",
      "interactions",
    ];

    const results: Record<string, any> = {};

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select("id", { count: "exact" })
          .eq("owner_user_id", userId)
          .limit(5);

        if (error) {
          // Table might not exist or might not have owner_user_id column yet
          results[table] = { 
            ok: false, 
            error: error.message,
            code: error.code,
            hint: error.hint 
          };
        } else {
          results[table] = { 
            ok: true, 
            count: data?.length ?? 0,
            totalCount: count ?? null
          };
        }
      } catch (err: any) {
        const status = typeof err?.status === "number" ? err.status : 500;
      
        console.error("AUTOPILOT SCAN ERROR:", err);
        console.error("AUTOPILOT SCAN ERROR MESSAGE:", err?.message);
      
        return NextResponse.json(
          { ok: false, error: err?.message || "Failed to trigger scan" },
          { status }
        );
      }
      
    }

    // Also test that we CANNOT access other users' data
    // Try to query without owner filter (should be caught by audit, but let's verify)
    const { data: allData, error: allError } = await supabase
      .from("crm_contacts")
      .select("owner_user_id", { count: "exact" })
      .limit(10);

    const hasOtherUsers = allData?.some((row: any) => row.owner_user_id && row.owner_user_id !== userId) ?? false;

    return jsonOk({ 
      ok: true, 
      userId,
      results,
      securityCheck: {
        canAccessOtherUsersData: hasOtherUsers,
        warning: hasOtherUsers ? "⚠️ SECURITY RISK: Queries without owner_user_id filter can access other users' data!" : "✅ Safe: No cross-user data leakage detected in test query",
        note: "This test query bypasses owner_user_id filter - in production, ALL queries must use .eq('owner_user_id', userId)"
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED: User must be authenticated") {
      return jsonError("UNAUTHORIZED: User must be authenticated", 401);
    }
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
}


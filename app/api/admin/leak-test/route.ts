// Leak Test API (Dev Only)
// GET /api/admin/leak-test
// app/api/admin/leak-test/route.ts

import { NextRequest } from "next/server";
import { getOwnerUserIdOrNull } from "@/lib/auth/owner";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk } from "@/lib/api/routeErrors";

// Only allow in dev/staging
const ALLOWED_ENV = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

export async function GET(request: NextRequest) {
  if (!ALLOWED_ENV) {
    return jsonOk({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const userId = await getOwnerUserIdOrNull();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const tableName = searchParams.get("table");

    if (!tableName) {
      return jsonOk({ error: "table parameter required" }, { status: 400 });
    }

    // Attempt query WITHOUT owner filter (RLS should block or return 0)
    const { data, error, count } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      // If RLS blocks it, that's good - return pass
      if (error.code === "42501" || error.message.includes("permission") || error.message.includes("policy")) {
        return jsonOk({
          ok: true,
          count: 0,
          hasOwnerFilter: false,
          blockedByRLS: true,
          message: "RLS blocked query (good!)",
        });
      }
      return jsonOk({ ok: false, error: error.message }, { status: 500 });
    }

    return jsonOk({
      ok: true,
      count: count || 0,
      hasOwnerFilter: false,
      blockedByRLS: false,
      message: count === 0 ? "No rows returned (safe)" : "Rows returned without filter (potential leak!)",
    });
  } catch (err: any) {
    return jsonOk({ ok: false, error: err.message }, { status: 500 });
  }
}


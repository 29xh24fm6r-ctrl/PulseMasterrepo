// app/api/journal/pull/route.ts
// DEPRECATED: This endpoint is no longer used for journal retrieval.
// All journal entries must be accessed via Supabase endpoints.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Deprecated: journal entries are Supabase-only. Use GET /api/journal instead.",
      deprecated: true,
      migration: "Update your code to call GET /api/journal with optional query params: ?start_date=...&end_date=...",
    },
    { status: 410 } // 410 Gone
  );
}

/*
 * LEGACY CODE REMOVED FOR SUPABASE-ONLY ARCHITECTURE
 *
 * This endpoint previously read journal entries from Notion.
 * All journal operations now go through Supabase endpoints:
 * - GET /api/journal - List journal entries (with date range filters)
 * - POST /api/journal - Create journal entry
 * - PATCH /api/journal/[id] - Update journal entry
 * - DELETE /api/journal/[id] - Delete journal entry
 *
 * See docs/SUPABASE_ONLY.md for architecture policy.
 */

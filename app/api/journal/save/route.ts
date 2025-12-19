// app/api/journal/save/route.ts
// DEPRECATED: This endpoint is no longer used for journal saving.
// All journal entries must be saved via Supabase endpoints.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Deprecated: journal entries are Supabase-only. Use POST /api/journal instead.",
      deprecated: true,
      migration: "Update your code to call POST /api/journal with { entry_date, title, content, mood, tags }.",
    },
    { status: 410 } // 410 Gone
  );
}

/*
 * LEGACY CODE REMOVED FOR SUPABASE-ONLY ARCHITECTURE
 *
 * This endpoint previously saved journal entries to Notion.
 * All journal operations now go through Supabase endpoints:
 * - POST /api/journal - Create journal entry
 * - PATCH /api/journal/[id] - Update journal entry
 *
 * See docs/SUPABASE_ONLY.md for architecture policy.
 */

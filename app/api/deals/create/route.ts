// app/api/deals/create/route.ts
// DEPRECATED: This endpoint is no longer used for deal creation.
// All deals must be created via Supabase endpoints.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Deprecated: deals are Supabase-only. Use POST /api/deals instead.",
      deprecated: true,
      migration: "Update your code to call POST /api/deals with the same payload structure.",
    },
    { status: 410 } // 410 Gone
  );
}

/*
 * LEGACY CODE REMOVED FOR SUPABASE-ONLY ARCHITECTURE
 *
 * This endpoint previously created deals in Notion.
 * All deal operations now go through Supabase endpoints:
 * - GET /api/deals - List deals
 * - POST /api/deals - Create deal
 * - PATCH /api/deals/[dealId] - Update deal
 * - DELETE /api/deals/[dealId] - Delete deal
 *
 * See docs/SUPABASE_ONLY.md for architecture policy.
 */

// app/api/deals/update-status/route.ts
// DEPRECATED: This endpoint is no longer used for deal updates.
// All deals must be updated via Supabase endpoints.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const dealId = body?.dealId;

  if (!dealId) {
    return NextResponse.json(
      {
        error: "Deprecated: deals are Supabase-only. Use PATCH /api/deals/[dealId] instead.",
        deprecated: true,
        migration: "Update your code to call PATCH /api/deals/[dealId] with { stage: '...' }.",
      },
      { status: 410 }
    );
  }

  return NextResponse.json(
    {
      error: "Deprecated: deals are Supabase-only. Use PATCH /api/deals/[id] instead.",
      deprecated: true,
      migration: `Update your code to call PATCH /api/deals/${dealId} with { stage: '...' }.`,
    },
    { status: 410 } // 410 Gone
  );
}

/*
 * LEGACY CODE REMOVED FOR SUPABASE-ONLY ARCHITECTURE
 *
 * This endpoint previously updated deals in Notion.
 * All deal operations now go through Supabase endpoints:
 * - PATCH /api/deals/[dealId] - Update deal (including stage)
 *
 * See docs/SUPABASE_ONLY.md for architecture policy.
 */

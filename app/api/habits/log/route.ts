// app/api/habits/log/route.ts
// DEPRECATED: This endpoint is no longer used for habit logging.
// All habits must be logged via Supabase endpoints.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const habitId = body?.habitId;

  if (!habitId) {
    return NextResponse.json(
      {
        error: "Deprecated: habits are Supabase-only. Use POST /api/habits/[id]/log instead.",
        deprecated: true,
        migration: "Update your code to call POST /api/habits/[habitId]/log with { occurred_on: '...', count: 1 }.",
      },
      { status: 410 }
    );
  }

  return NextResponse.json(
    {
      error: "Deprecated: habits are Supabase-only. Use POST /api/habits/[id]/log instead.",
      deprecated: true,
      migration: `Update your code to call POST /api/habits/${habitId}/log with { occurred_on: '...', count: 1 }.`,
    },
    { status: 410 } // 410 Gone
  );
}

/*
 * LEGACY CODE REMOVED FOR SUPABASE-ONLY ARCHITECTURE
 *
 * This endpoint previously logged habits in Notion.
 * All habit operations now go through Supabase endpoints:
 * - POST /api/habits/[id]/log - Log habit completion
 *
 * See docs/SUPABASE_ONLY.md for architecture policy.
 */

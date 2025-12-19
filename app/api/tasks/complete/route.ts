// app/api/tasks/complete/route.ts
// DEPRECATED: This endpoint is no longer used for task completion.
// All tasks must be updated via Supabase endpoints.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const taskId = body?.taskId;

  if (!taskId) {
    return NextResponse.json(
      {
        error: "Deprecated: tasks are Supabase-only. Use PATCH /api/tasks/[id] instead.",
        deprecated: true,
        migration: "Update your code to call PATCH /api/tasks/[taskId] with { status: 'done' }.",
      },
      { status: 410 }
    );
  }

  return NextResponse.json(
    {
      error: "Deprecated: tasks are Supabase-only. Use PATCH /api/tasks/[id] instead.",
      deprecated: true,
      migration: `Update your code to call PATCH /api/tasks/${taskId} with { status: 'done' }.`,
    },
    { status: 410 } // 410 Gone
  );
}

/*
 * LEGACY CODE REMOVED FOR SUPABASE-ONLY ARCHITECTURE
 *
 * This endpoint previously updated tasks in Notion.
 * All task operations now go through Supabase endpoints:
 * - PATCH /api/tasks/[id] - Update task (including status)
 *
 * See docs/SUPABASE_ONLY.md for architecture policy.
 */

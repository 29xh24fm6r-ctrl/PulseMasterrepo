// app/api/tasks/create/route.ts
// DEPRECATED: This endpoint is no longer used for task creation.
// All tasks must be created via Supabase endpoints.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Deprecated: tasks are Supabase-only. Use POST /api/tasks instead.",
      deprecated: true,
      migration: "Update your code to call POST /api/tasks with the same payload structure.",
    },
    { status: 410 } // 410 Gone
  );
}

/*
 * LEGACY CODE REMOVED FOR SUPABASE-ONLY ARCHITECTURE
 *
 * This endpoint previously created tasks in Notion.
 * All task operations now go through Supabase endpoints:
 * - GET /api/tasks - List tasks
 * - POST /api/tasks - Create task
 * - PATCH /api/tasks/[id] - Update task
 * - DELETE /api/tasks/[id] - Delete task (or archive)
 *
 * See docs/SUPABASE_ONLY.md for architecture policy.
 */

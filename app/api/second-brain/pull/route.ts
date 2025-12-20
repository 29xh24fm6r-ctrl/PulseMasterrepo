// Legacy Notion route - migrated to Supabase
// This endpoint is no longer available. Use Supabase-backed services instead.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { 
      ok: false, 
      error: "This endpoint has been migrated to Supabase. Notion is no longer supported.",
      migrated: true,
    },
    { status: 410 } // Gone
  );
}

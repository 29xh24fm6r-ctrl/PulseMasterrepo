// Legacy Notion route - migrated to Supabase
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { 
      ok: false, 
      error: "This endpoint has been migrated to Supabase. Notion is no longer supported.",
      migrated: true,
    },
    { status: 410 }
  );
}

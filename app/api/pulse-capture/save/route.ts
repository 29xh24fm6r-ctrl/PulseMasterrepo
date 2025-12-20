// Legacy Notion route - migrated to Supabase
import { NextRequest, NextResponse } from "next/server";

export async function GET(req?: NextRequest) {
  return NextResponse.json(
    { 
      ok: false, 
      error: "This endpoint has been migrated to Supabase. Notion is no longer supported.",
      migrated: true,
    },
    { status: 410 }
  );
}

export async function POST(req?: NextRequest) {
  return NextResponse.json(
    { 
      ok: false, 
      error: "This endpoint has been migrated to Supabase. Notion is no longer supported.",
      migrated: true,
    },
    { status: 410 }
  );
}

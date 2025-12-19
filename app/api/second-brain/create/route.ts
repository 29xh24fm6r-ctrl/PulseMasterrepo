// app/api/second-brain/create/route.ts
// DEPRECATED: This endpoint is no longer used for contact creation.
// All contacts must be created via POST /api/contacts (Supabase-only).
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Deprecated: contacts are Supabase-only. Use POST /api/contacts instead.",
      deprecated: true,
      migration: "Update your code to call POST /api/contacts with the same payload structure."
    },
    { status: 410 } // 410 Gone
  );
}

/* 
 * LEGACY CODE REMOVED FOR SUPABASE-ONLY ARCHITECTURE
 * 
 * This endpoint previously created contacts in Notion.
 * All contact creation now goes through POST /api/contacts which stores
 * contacts in Supabase (crm_contacts table).
 * 
 * See docs/SUPABASE_ONLY.md for architecture policy.
 */

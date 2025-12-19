import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Simple People List API - Returns canonical active contacts only
 * This is a simpler alternative to /api/people/overview for debugging
 */
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Map Clerk -> DB UUID
  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  if (userErr || !userRow?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "User not found",
        meta: process.env.NEXT_PUBLIC_DEBUG_PULSE === "1" ? { clerkUserId, userErr: userErr?.message } : undefined,
      },
      { status: 404 }
    );
  }

  const dbUserId = userRow.id;

  // Canonical contacts only - use user_id (UUID) + status='active'
  const { data, error } = await supabaseAdmin
    .from("crm_contacts")
    .select("id, full_name, primary_email, status, owner_user_id, user_id, created_at, updated_at")
    .eq("user_id", dbUserId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        meta: process.env.NEXT_PUBLIC_DEBUG_PULSE === "1" ? { clerkUserId, dbUserId, error: error.message } : undefined,
      },
      { status: 500 }
    );
  }

  const contacts = data ?? [];

  // Debug: Check if there are contacts with null status or different user_id
  let debugInfo: any = undefined;
  if (process.env.NEXT_PUBLIC_DEBUG_PULSE === "1") {
    const { data: allContacts } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, status, user_id, owner_user_id")
      .eq("user_id", dbUserId)
      .limit(100);

    const total = (allContacts || []).length;
    const active = (allContacts || []).filter((c: any) => c.status === "active").length;
    const merged = (allContacts || []).filter((c: any) => c.status === "merged").length;
    const nullStatus = (allContacts || []).filter((c: any) => !c.status || c.status === null).length;

    debugInfo = {
      clerkUserId,
      dbUserId,
      totalContactsForUser: total,
      activeCount: active,
      mergedCount: merged,
      nullStatusCount: nullStatus,
      returnedCount: contacts.length,
    };
  }

  return NextResponse.json(
    {
      ok: true,
      contacts,
      count: contacts.length,
      meta: debugInfo,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}


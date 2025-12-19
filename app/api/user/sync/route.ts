// app/api/user/sync/route.ts
// User sync endpoint - ensures user exists in public.users table
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const email = user.emailAddresses?.[0]?.emailAddress ?? null;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;
    const phone = user.phoneNumbers?.[0]?.phoneNumber ?? null;

    // IMPORTANT: set clerk_user_id (NOT NULL in DB) + clerk_id (compat)
    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          clerk_user_id: userId,
          clerk_id: userId,
          email,
          name,
          phone,
          updated_at: new Date().toISOString(),
        },
        {
          // Prefer the canonical unique key if you have it
          onConflict: "clerk_user_id",
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, user: data });
  } catch (err: any) {
    console.error("User sync error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

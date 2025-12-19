import "server-only";

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // Try Clerk first (source of truth for session identity)
  const clerkUser = await currentUser();

  // Pull your app user row if it exists (don't fail if missing)
  const { data: appUser } = await supabaseAdmin
    .from("users")
    .select("id, clerk_user_id, clerk_id, email, name, phone, created_at, updated_at")
    .or(`clerk_user_id.eq.${userId},clerk_id.eq.${userId}`)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    clerk: {
      userId,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? null,
      name: `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() || null,
      imageUrl: clerkUser?.imageUrl ?? null,
    },
    user: appUser ?? null,
  });
}

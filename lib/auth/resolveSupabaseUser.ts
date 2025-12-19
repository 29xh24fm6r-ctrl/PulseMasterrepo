import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export class UnauthorizedError extends Error {
  status = 401 as const;
  constructor(message = "UNAUTHORIZED: User must be authenticated") {
    super(message);
  }
}

export class NotSyncedError extends Error {
  status = 409 as const;
  constructor(message = "User not synced to Supabase users table") {
    super(message);
  }
}

/**
 * Canonical identity resolver for API routes.
 * - Uses Clerk auth() (session/cookie-backed)
 * - Maps Clerk userId -> public.users.id (Supabase UUID)
 * - Returns Supabase access token for RLS-enforced client
 */
export async function resolveSupabaseUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new UnauthorizedError();
  }

  // Get Supabase access token from Clerk JWT template
  const authObj = await auth();
  const token = await authObj.getToken({ template: "supabase" });
  if (!token) {
    throw new Error(
      "Missing Supabase token. In Clerk Dashboard, create JWT template named 'supabase' with audience 'authenticated'."
    );
  }

  // 1) Try to find the Supabase user row
  const { data: row, error } = await supabaseAdmin
    .from("users")
    .select("id, clerk_user_id, clerk_id")
    .or(`clerk_user_id.eq.${clerkUserId},clerk_id.eq.${clerkUserId}`)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed reading users table: ${error.message}`);
  }

  // 2) If missing, we can optionally auto-sync (safe minimal upsert)
  if (!row?.id) {
    const user = await currentUser().catch(() => null);

    const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
    const name =
      `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || null;
    const phone = user?.phoneNumbers?.[0]?.phoneNumber ?? null;

    const { data: upserted, error: upErr } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          clerk_user_id: clerkUserId,
          clerk_id: clerkUserId, // compatibility
          email,
          name,
          phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_user_id" }
      )
      .select("id")
      .single();

    if (upErr || !upserted?.id) {
      throw new NotSyncedError(
        `User not synced (upsert failed): ${upErr?.message ?? "unknown"}`
      );
    }

    return { clerkUserId, supabaseUserId: upserted.id, supabaseAccessToken: token };
  }

  return { clerkUserId, supabaseUserId: row.id, supabaseAccessToken: token };
}

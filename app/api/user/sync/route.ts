import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

// Phase 27-J: Hardened Sync (No 500s)
export async function POST(req: Request) {
  const debugId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  console.log(`[sync:${debugId}] Starting user sync`);

  try {
    const access = await requireOpsAuth(req as any);
    if (!access.ok || !access.gate) {
      // 401 is acceptable here as it's a hard auth failure, not a runtime crash
      return NextResponse.json({ ok: false, code: "UNAUTHED", debugId }, { status: 401 });
    }
    const userId = access.gate.canon.clerkUserId;

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ ok: false, code: "USER_NOT_FOUND", debugId }, { status: 404 });
    }

    // Check for required env vars to prevent unhandled Supabase errors
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`[sync:${debugId}] Missing Supabase env variables`);
      return NextResponse.json({ ok: false, code: "CONFIG_MISSING", debugId }, { status: 200 });
    }

    const { data, error } = await getSupabaseAdminRuntimeClient()
      .from("users")
      .upsert({
        clerk_id: userId,
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        phone: user.phoneNumbers[0]?.phoneNumber,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "clerk_id",
      })
      .select()
      .single();

    if (error) {
      console.error(`[sync:${debugId}] Supabase error:`, error);
      // Return 200 with error code to prevent client loop
      return NextResponse.json({ ok: false, code: "DB_ERROR", message: error.message, debugId }, { status: 200 });
    }

    return NextResponse.json({ ok: true, user: data, debugId });
  } catch (err: any) {
    console.error(`[sync:${debugId}] Unhandled error:`, err);
    // Return 200 with error code to prevent client loop
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", message: err.message, debugId }, { status: 200 });
  }
}
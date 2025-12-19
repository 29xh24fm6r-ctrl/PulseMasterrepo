import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runNewsDripEngine } from "@/lib/news/drip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    console.log("[NewsDrip] Starting news drip engine for user:", dbUserId);
    const report = await runNewsDripEngine(dbUserId);

    return NextResponse.json(
      { ok: true, report },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[NewsDrip] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


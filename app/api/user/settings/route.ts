// app/api/user/settings/route.ts
// Generic user settings endpoint
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/requireUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/pulse/isUuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const sp = supabaseAdmin;

    // Dev override: non-UUID means no real DB user yet
    if (!isUuid(userId)) {
      return NextResponse.json({ ok: true, settings: {} });
    }

    // Try to get user settings from a generic settings table (if it exists)
    // For now, return empty settings object
    const { data: settings } = await sp
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .catch(() => ({ data: null }));

    return NextResponse.json({
      ok: true,
      settings: settings?.settings ?? {},
    });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const sp = supabaseAdmin;

    // Dev override: non-UUID means no real DB user yet
    if (!isUuid(userId)) {
      return NextResponse.json({ ok: true });
    }

    const body = await req.json().catch(() => ({}));
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ ok: false, error: "settings must be an object" }, { status: 400 });
    }

    // Upsert user settings (if table exists)
    await sp
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          settings: settings,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .catch(() => {
        // If table doesn't exist, that's okay for now
        console.warn("[UserSettings] user_settings table may not exist");
      });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}


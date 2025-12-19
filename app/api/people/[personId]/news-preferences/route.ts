import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { personId } = await params;

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get preferences (or return defaults)
    const { data: prefs } = await supabaseAdmin
      .from("contact_news_preferences")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", personId)
      .maybeSingle();

    if (prefs) {
      return NextResponse.json({ ok: true, preferences: prefs });
    }

    // Return defaults
    return NextResponse.json({
      ok: true,
      preferences: {
        enabled: false,
        frequency: "weekly",
        max_per_week: 1,
        keywords: null,
        exclude_keywords: null,
        preferred_sources: null,
        last_sent_at: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GetNewsPreferences] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { personId } = await params;
    const body = await req.json();
    const { enabled, frequency, max_per_week, keywords, exclude_keywords, preferred_sources } = body;

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Verify contact exists
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("id", personId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Upsert preferences
    const { data: prefs, error } = await supabaseAdmin
      .from("contact_news_preferences")
      .upsert(
        {
          user_id: dbUserId,
          contact_id: personId,
          enabled: enabled !== undefined ? enabled : true,
          frequency: frequency || "weekly",
          max_per_week: max_per_week || 1,
          keywords: keywords || null,
          exclude_keywords: exclude_keywords || null,
          preferred_sources: preferred_sources || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,contact_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[UpdateNewsPreferences] Error:", error);
      return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, preferences: prefs },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[UpdateNewsPreferences] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


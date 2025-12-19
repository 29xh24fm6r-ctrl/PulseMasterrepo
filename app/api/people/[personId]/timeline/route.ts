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

    // Get interaction events
    const { data: events, error } = await supabaseAdmin
      .from("interaction_events")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", personId)
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[GetTimeline] Error:", error);
      return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, events: events || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GetTimeline] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
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
    const { type, summary, occurred_at, payload_ref } = body;

    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    if (!summary || typeof summary !== "string" || summary.length === 0) {
      return NextResponse.json({ error: "Summary is required" }, { status: 400 });
    }

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

    // Create interaction event
    const { data: event, error } = await supabaseAdmin
      .from("interaction_events")
      .insert({
        user_id: dbUserId,
        contact_id: personId,
        type: type.trim(),
        summary: summary.trim(),
        occurred_at: occurred_at || new Date().toISOString(),
        payload_ref: payload_ref || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[CreateTimelineEvent] Error:", error);
      return NextResponse.json({ error: "Failed to create timeline event" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, event },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateTimelineEvent] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


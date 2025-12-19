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

    // Get dates
    const { data: dates, error } = await supabaseAdmin
      .from("contact_dates")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", personId)
      .order("date", { ascending: true });

    if (error) {
      console.error("[GetDates] Error:", error);
      return NextResponse.json({ error: "Failed to fetch dates" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, dates: dates || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GetDates] Error:", err);
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
    const { type, date, recurrence, notes } = body;

    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "Date type is required" }, { status: 400 });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) {
      return NextResponse.json({ error: "Valid date is required (YYYY-MM-DD)" }, { status: 400 });
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

    // Create date
    const { data: dateRecord, error } = await supabaseAdmin
      .from("contact_dates")
      .insert({
        user_id: dbUserId,
        contact_id: personId,
        type: type.trim(),
        date,
        recurrence: recurrence || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[CreateDate] Error:", error);
      return NextResponse.json({ error: "Failed to create date" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, date: dateRecord },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateDate] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


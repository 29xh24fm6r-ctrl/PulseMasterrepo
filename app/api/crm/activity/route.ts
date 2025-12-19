import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type = "note", body: noteBody, subject, deal_id, person_id } = body;

    if (!noteBody || typeof noteBody !== "string" || noteBody.length === 0) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Create interaction/activity
    const { data: activity, error: activityError } = await supabaseAdmin
      .from("crm_interactions")
      .insert({
        user_id: dbUserId,
        contact_id: person_id || null,
        deal_id: deal_id || null,
        type: type || "note",
        occurred_at: new Date().toISOString(),
        subject: subject || "Note",
        summary: noteBody.trim(),
        importance: 3,
      })
      .select()
      .single();

    if (activityError) {
      console.error("[CreateActivity] Error:", activityError);
      return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, activity },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateActivity] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


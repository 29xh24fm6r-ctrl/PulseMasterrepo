import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const { body: noteBody, title } = body;

    // Validate input
    if (!noteBody || typeof noteBody !== "string" || noteBody.length === 0) {
      return NextResponse.json({ error: "Note body is required" }, { status: 400 });
    }

    if (noteBody.length > 10000) {
      return NextResponse.json({ error: "Note too long (max 10000 chars)" }, { status: 400 });
    }

    if (title && title.length > 500) {
      return NextResponse.json({ error: "Title too long (max 500 chars)" }, { status: 400 });
    }

    // Resolve user UUID first
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Verify contact exists and belongs to user (use user_id UUID)
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("id", personId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Create interaction/note
    const { data: note, error: noteError } = await supabaseAdmin
      .from("crm_interactions")
      .insert({
        user_id: dbUserId,
        contact_id: personId,
        type: "note",
        occurred_at: new Date().toISOString(),
        subject: title || "Note",
        summary: noteBody,
        importance: 3,
      })
      .select()
      .single();

    if (noteError) {
      console.error("[LogNote] Error:", noteError);
      return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, note },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[LogNote] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


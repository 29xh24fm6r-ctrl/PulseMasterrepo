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
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { personId } = await params;
    const body = await req.json();
    const { channel = "email", due_at, message } = body;

    // Validate input
    if (!due_at || !/^\d{4}-\d{2}-\d{2}/.test(due_at)) {
      return NextResponse.json({ ok: false, error: "Valid due_at date is required" }, { status: 400 });
    }

    if (message && typeof message !== "string" && message.length > 5000) {
      return NextResponse.json({ ok: false, error: "Message too long (max 5000 chars)" }, { status: 400 });
    }

    if (!["email", "call", "text", "sms"].includes(channel.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Invalid channel" }, { status: 400 });
    }

    // Verify contact exists and belongs to user
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, full_name")
      .eq("id", personId)
      .eq("owner_user_id", clerkUserId)
      .maybeSingle();

    if (!contact?.id) {
      return NextResponse.json(
        { ok: false, error: "Contact not found or not accessible" },
        { status: 404 }
      );
    }

    // Convert due_at to timestamptz
    const dueDate = new Date(due_at);
    let dueAtValue: string | null = null;
    if (!isNaN(dueDate.getTime())) {
      dueAtValue = dueDate.toISOString();
    }

    // Create follow-up as a CRM task
    const { data: followup, error: followupError } = await supabaseAdmin
      .from("crm_tasks")
      .insert({
        owner_user_id: clerkUserId,
        contact_id: personId,
        title: `Follow-up with ${contact.full_name} (${channel})`,
        description: message || `Follow up via ${channel}`,
        status: "pending",
        priority: 3, // High priority for follow-ups
        due_at: dueAtValue,
      })
      .select("*")
      .single();

    if (followupError) {
      console.error("[CreateFollowup] Error:", followupError);
      return NextResponse.json({ ok: false, error: "Failed to create follow-up" }, { status: 500 });
    }

    // Also create an interaction record for tracking
    await supabaseAdmin.from("crm_interactions").insert({
      user_id: clerkUserId, // Note: may need UUID resolution if crm_interactions uses UUID
      contact_id: personId,
      type: "note",
      occurred_at: new Date().toISOString(),
      subject: `Follow-up scheduled: ${channel}`,
      summary: `Follow-up scheduled for ${due_at} via ${channel}${message ? `\n\n${message}` : ""}`,
      importance: 4,
    });

    return NextResponse.json(
      { ok: true, followup },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateFollowup] Error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/comm/call/save-to-brain - Save call transcript and analysis to Second Brain (interactions)
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { getCallSession } from "@/services/comm/store";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { callSessionId, contactId } = await request.json();

    if (!callSessionId) {
      return NextResponse.json({ error: "callSessionId required" }, { status: 400 });
    }

    // Get the call session
    const session = await getCallSession(callSessionId);
    if (!session) {
      return NextResponse.json({ error: "Call session not found" }, { status: 404 });
    }

    // Get the user's clerk_id from the session
    const clerkId = session.userId;
    if (!clerkId) {
      return NextResponse.json({ error: "No user associated with call" }, { status: 400 });
    }

    // Find or determine contactId
    let finalContactId = contactId || session.contactId;

    // If no contactId, try to find contact by phone number
    if (!finalContactId && session.toNumber) {
      const cleanPhone = session.toNumber.replace(/\D/g, "");
      const phoneVariants = [
        cleanPhone,
        `+1${cleanPhone}`,
        `+${cleanPhone}`,
        cleanPhone.slice(-10), // Last 10 digits
      ];

      const { data: foundContact } = await supabase
        .from("contacts")
        .select("id")
        .or(phoneVariants.map(p => `phone.ilike.%${p.slice(-10)}%`).join(","))
        .limit(1)
        .single();

      if (foundContact) {
        finalContactId = foundContact.id;
      }
    }

    // Build the interaction record
    const interactionData: any = {
      user_id: clerkId,
      type: "call",
      direction: session.direction || "outbound",
      occurred_at: session.startedAt || new Date().toISOString(),
      duration_seconds: session.durationSec || 0,
      transcript: session.transcriptText || null,
      summary: session.summaryShort || session.summaryDetailed || null,
      sentiment: session.sentiment || "neutral",
      topics: session.tags || [],
      action_items: session.actionsJson || [],
      metadata: {
        callSessionId,
        fromNumber: session.fromNumber,
        toNumber: session.toNumber,
        twilioCallSid: session.twilioCallSid,
      },
    };

    // Add contact_id if we have one
    if (finalContactId) {
      interactionData.contact_id = finalContactId;
    }

    // Insert interaction
    const { data: interaction, error } = await supabase
      .from("interactions")
      .insert(interactionData)
      .select()
      .single();

    if (error) {
      console.error("Failed to save interaction:", error);
      throw error;
    }

    // Update the contact's last_contact date
    if (finalContactId) {
      await supabase
        .from("contacts")
        .update({
          last_contact: new Date().toISOString(),
          last_interaction_type: "call",
        })
        .eq("id", finalContactId);
    }

    // Create follow-up tasks from action items
    if (session.actionsJson && Array.isArray(session.actionsJson)) {
      const followUps = session.actionsJson
        .filter((a: any) => a.action)
        .map((a: any) => ({
          user_id: clerkId,
          contact_id: finalContactId || null,
          title: a.action,
          priority: a.priority || "medium",
          status: "pending",
          source: "call",
          source_id: callSessionId,
          due_date: a.dueDate || null,
        }));

      if (followUps.length > 0) {
        await supabase.from("follow_ups").insert(followUps);
        console.log(`📋 Created ${followUps.length} follow-ups from call`);
      }
    }

    console.log(`🧠 Saved call to Second Brain: ${interaction.id}`);

    return NextResponse.json({
      ok: true,
      interactionId: interaction.id,
      contactId: finalContactId,
      followUpsCreated: session.actionsJson?.length || 0,
    });

  } catch (err: any) {
    console.error("Save to brain error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import "server-only";
import { getCallSession } from "@/lib/comm/store";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface SaveToBrainResult {
  ok: boolean;
  interactionId?: string;
  contactId?: string;
  followUpsCreated?: number;
  error?: string;
}

/**
 * Save call transcript and analysis to Second Brain (interactions)
 * Extracted from app/api/comm/call/save-to-brain/route.ts
 */
export async function saveCallToBrain(
  callSessionId: string,
  contactId?: string
): Promise<SaveToBrainResult> {
  try {
    if (!callSessionId) {
      return { ok: false, error: "callSessionId required" };
    }

    // Get the call session
    const session = await getCallSession(callSessionId);
    if (!session) {
      return { ok: false, error: "Call session not found" };
    }

    // Get the user's clerk_id from the session
    const clerkId = session.userId;
    if (!clerkId) {
      return { ok: false, error: "No user associated with call" };
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

      const { data: foundContact } = await supabaseAdmin
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
    const { data: interaction, error } = await supabaseAdmin
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
      await supabaseAdmin
        .from("contacts")
        .update({ 
          last_contact: new Date().toISOString(),
          last_interaction_type: "call",
        })
        .eq("id", finalContactId);
    }

    // Create follow-up tasks from action items
    let followUpsCreated = 0;
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
        await supabaseAdmin.from("follow_ups").insert(followUps);
        followUpsCreated = followUps.length;
        console.log(`📋 Created ${followUpsCreated} follow-ups from call`);
      }
    }

    console.log(`🧠 Saved call to Second Brain: ${interaction.id}`);

    return {
      ok: true,
      interactionId: interaction.id,
      contactId: finalContactId,
      followUpsCreated,
    };
  } catch (err: any) {
    console.error("Save to brain error:", err);
    return {
      ok: false,
      error: err.message,
    };
  }
}


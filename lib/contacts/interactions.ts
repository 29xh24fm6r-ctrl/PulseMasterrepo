// Contact Interaction Event Logging
// lib/contacts/interactions.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentEmotionState } from "@/lib/emotion/state";

export interface LogContactInteractionParams {
  userId: string;
  contactId: string;
  commMessageId: string;
  channelType: "email" | "sms" | "call" | "audio";
  direction: "incoming" | "outgoing";
  occurredAt: Date;
  sentiment?: number; // -1..1
  emotionLabel?: string;
  containsPromise?: boolean;
  containsConflict?: boolean;
  responseTimeMinutes?: number | null;
}

/**
 * Log a contact interaction event
 */
export async function logContactInteraction(
  params: LogContactInteractionParams
): Promise<void> {
  const {
    userId,
    contactId,
    commMessageId,
    channelType,
    direction,
    occurredAt,
    sentiment,
    emotionLabel,
    containsPromise,
    containsConflict,
    responseTimeMinutes,
  } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // If sentiment/emotion not provided, try to detect from emotion OS
  let finalSentiment = sentiment;
  let finalEmotionLabel = emotionLabel;

  if (!finalSentiment || !finalEmotionLabel) {
    try {
      const emotionState = await getCurrentEmotionState(userId);
      if (emotionState) {
        finalSentiment = emotionState.sentiment_score || 0;
        finalEmotionLabel = emotionState.detected_emotion || null;
      }
    } catch (err) {
      console.warn("[ContactInteractions] Failed to get emotion state:", err);
    }
  }

  await supabaseAdmin.from("contact_interaction_events").insert({
    user_id: dbUserId,
    contact_id: contactId,
    comm_message_id: commMessageId,
    channel_type: channelType,
    direction: direction,
    occurred_at: occurredAt.toISOString(),
    sentiment: finalSentiment || 0,
    emotion_label: finalEmotionLabel || null,
    contains_promise: containsPromise || false,
    contains_conflict: containsConflict || false,
    response_time_minutes: responseTimeMinutes || null,
  });
}

/**
 * Get contact ID from comm message
 * Tries multiple methods: voice profile, channel mapping, email address
 */
export async function getContactIdFromCommMessage(
  userId: string,
  commMessageId: string
): Promise<string | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Method 1: Check if message has speaker with known voice profile
  const { data: speakers } = await supabaseAdmin
    .from("comm_message_speakers")
    .select("speaker_profile_id, voice_profiles(contact_id)")
    .eq("comm_message_id", commMessageId)
    .not("speaker_profile_id", "is", null)
    .limit(1);

  if (speakers && speakers.length > 0 && speakers[0].voice_profiles) {
    const contactId = (speakers[0].voice_profiles as any).contact_id;
    if (contactId) {
      return contactId;
    }
  }

  // Method 2: Check comm_message for from_identity (email/phone)
  const { data: message } = await supabaseAdmin
    .from("comm_messages")
    .select("from_identity, to_identity")
    .eq("id", commMessageId)
    .single();

  if (message) {
    // Try to find contact by email or phone
    const identity = message.from_identity || message.to_identity;
    if (identity) {
      // Check if it's an email
      if (identity.includes("@")) {
        const { data: contact } = await supabaseAdmin
          .from("contacts")
          .select("id")
          .eq("user_id", dbUserId)
          .ilike("email", `%${identity}%`)
          .maybeSingle();

        if (contact) {
          return contact.id;
        }
      }

      // Check if it's a phone number
      const phoneDigits = identity.replace(/\D/g, "");
      if (phoneDigits.length >= 10) {
        const { data: contact } = await supabaseAdmin
          .from("contacts")
          .select("id")
          .eq("user_id", dbUserId)
          .or(`phone.ilike.%${phoneDigits}%,phone.ilike.%${identity}%`)
          .maybeSingle();

        if (contact) {
          return contact.id;
        }
      }
    }
  }

  // Method 3: Check comm_channel for contact mapping
  if (message) {
    const { data: channel } = await supabaseAdmin
      .from("comm_channels")
      .select("external_id, label")
      .eq("id", (message as any).channel_id)
      .single();

    // Could add channel-to-contact mapping here if needed
  }

  return null;
}


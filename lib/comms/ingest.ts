// Communications Ingestion
// lib/comms/ingest.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CommsMessageInput } from "./types";
import { extractResponsibilitiesFromComms, upsertResponsibilitiesForCommsMessage } from "./responsibilities";
import { detectPromisesInCommsMessage, upsertPromisesForCommsMessage } from "./promises";

/**
 * Ingest a communications message (SMS or call)
 */
export async function ingestCommsMessage(input: CommsMessageInput): Promise<string> {
  const {
    userId,
    channelType,
    externalId,
    fromIdentity,
    toIdentity,
    occurredAt,
    subject,
    body,
    rawData,
    direction,
  } = input;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Find or create comm_channels row
  const channelKey = externalId || fromIdentity || toIdentity;
  const { data: existingChannel } = await supabaseAdmin
    .from("comm_channels")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("channel_type", channelType)
    .eq("external_id", channelKey)
    .maybeSingle();

  let channelId: string;
  if (existingChannel) {
    channelId = existingChannel.id;
  } else {
    const { data: newChannel } = await supabaseAdmin
      .from("comm_channels")
      .insert({
        user_id: dbUserId,
        channel_type: channelType,
        external_id: channelKey,
        label: channelKey, // Can be enhanced later with contact names
      })
      .select("id")
      .single();

    if (!newChannel) {
      throw new Error("Failed to create comm channel");
    }
    channelId = newChannel.id;
  }

  // 2. Insert into comm_messages
  const { data: message } = await supabaseAdmin
    .from("comm_messages")
    .insert({
      user_id: dbUserId,
      channel_id: channelId,
      source_type: channelType,
      external_id: externalId || null,
      direction: direction,
      from_identity: fromIdentity,
      to_identity: toIdentity,
      occurred_at: occurredAt.toISOString(),
      subject: subject || null,
      body: body,
      raw_data: rawData || null,
    })
    .select("id")
    .single();

  if (!message) {
    throw new Error("Failed to create comm message");
  }

  const commMessageId = message.id;

  // 3. Extract responsibilities and promises
  try {
    // Extract responsibilities
    const responsibilities = await extractResponsibilitiesFromComms({
      body,
      subject: subject || null,
      fromIdentity,
      toIdentity,
      occurredAt,
      sourceType: channelType,
    });

    if (responsibilities.length > 0) {
      await upsertResponsibilitiesForCommsMessage({
        userId,
        commMessageId,
        responsibilities,
      });
    }

    // Extract promises (for outgoing messages)
    if (direction === "outgoing") {
      const promises = await detectPromisesInCommsMessage({
        body,
        fromIdentity,
        toIdentity,
        occurredAt,
        direction,
      });

      if (promises.length > 0) {
        await upsertPromisesForCommsMessage({
          userId,
          commMessageId,
          promises,
        });
      }
    }
  } catch (err) {
    console.error("[CommsIngest] Failed to extract responsibilities/promises:", err);
    // Don't fail the ingestion if extraction fails
  }

  // Log contact interaction
  try {
    const { logContactInteraction, getContactIdFromCommMessage } = await import("@/lib/contacts/interactions");
    const contactId = await getContactIdFromCommMessage(userId, commMessageId);

    if (contactId) {
      await logContactInteraction({
        userId,
        contactId,
        commMessageId,
        channelType: channelType,
        direction: direction,
        occurredAt,
        containsPromise: direction === "outgoing", // Will be updated when promises are detected
      });
    }
  } catch (err) {
    console.error("[CommsIngest] Failed to log contact interaction:", err);
  }

  return commMessageId;
}


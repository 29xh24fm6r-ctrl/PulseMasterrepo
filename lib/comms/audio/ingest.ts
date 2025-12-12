// Audio Capture Ingestion
// lib/comms/audio/ingest.ts

import { supabaseAdmin } from "@/lib/supabase";
import { AudioIngestInput } from "./types";
import { transcribeAudio } from "./transcription";
import { extractResponsibilitiesFromComms, upsertResponsibilitiesForCommsMessage } from "../responsibilities";
import { detectPromisesInCommsMessage, upsertPromisesForCommsMessage } from "../promises";
import { diarizeAudio } from "@/lib/voice/diarization/diarize";
import { generateSpeakerEmbedding } from "@/lib/voice/diarization/embeddings";
import { matchSpeakerEmbeddingToProfiles } from "@/lib/voice/identification/match";
import { matchToUnknownSpeakers, createNewUnknownSpeaker, updateUnknownSpeaker } from "@/lib/voice/identification/match-unknown";

/**
 * Ingest audio capture and convert to comm_messages
 */
export async function ingestAudioCapture(input: AudioIngestInput): Promise<string> {
  const { userId, audioUrl, durationSeconds, source, occurredAt, metadata } = input;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Generate transcript
  let transcript: string;
  try {
    transcript = await transcribeAudio(audioUrl);
  } catch (err) {
    console.error("[AudioIngest] Transcription failed:", err);
    throw new Error("Failed to transcribe audio. Please provide a transcript manually.");
  }

  // 2. Create or find audio capture channel
  const channelKey = `audio_capture_${source}`;
  const { data: existingChannel } = await supabaseAdmin
    .from("comm_channels")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("channel_type", "other")
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
        channel_type: "other",
        external_id: channelKey,
        label: metadata?.title || `Audio Capture (${source})`,
        audio_mode: true,
      })
      .select("id")
      .single();

    if (!newChannel) {
      throw new Error("Failed to create audio channel");
    }
    channelId = newChannel.id;
  }

  // 3. Insert comm_messages row
  const { data: message } = await supabaseAdmin
    .from("comm_messages")
    .insert({
      user_id: dbUserId,
      channel_id: channelId,
      source_type: "audio",
      external_id: audioUrl, // Use URL as external ID for now
      direction: "incoming", // Audio capture is typically incoming
      from_identity: metadata?.participants?.join(", ") || "Unknown",
      to_identity: "User",
      occurred_at: occurredAt.toISOString(),
      subject: metadata?.title || `Audio Capture (${source})`,
      body: transcript,
      audio_url: audioUrl,
      raw_data: {
        duration_seconds: durationSeconds,
        source: source,
        metadata: metadata || {},
      },
    })
    .select("id")
    .single();

  if (!message) {
    throw new Error("Failed to create comm message");
  }

  const commMessageId = message.id;

  // 4. Process speaker identification (if diarization succeeded)
  if (segments.length > 0) {
    try {
      // Get user's voice identity settings
      const { data: settings } = await supabaseAdmin
        .from("user_voice_identity_settings")
        .select("speaker_identification_enabled")
        .eq("user_id", dbUserId)
        .maybeSingle();

      const speakerIdEnabled = settings?.speaker_identification_enabled !== false;

      if (speakerIdEnabled) {
        for (const segment of segments) {
          // Generate embedding for this segment
          const embedding = await generateSpeakerEmbedding(segment.transcript);

          // Try to match to known profiles
          const knownMatch = await matchSpeakerEmbeddingToProfiles(userId, embedding);

          let speakerProfileId: string | null = null;
          let unknownSpeakerId: string | null = null;
          let confidence = knownMatch.confidence;

          if (knownMatch.isKnown && knownMatch.profileId) {
            // It's a known voice!
            speakerProfileId = knownMatch.profileId;
          } else {
            // Try unknown speakers
            const unknownMatch = await matchToUnknownSpeakers(userId, embedding);
            if (unknownMatch.unknownId) {
              // Reuse unknown profile
              unknownSpeakerId = unknownMatch.unknownId;
              confidence = unknownMatch.confidence;
              await updateUnknownSpeaker(unknownMatch.unknownId, embedding);
            } else {
              // Create a new unknown speaker
              unknownSpeakerId = await createNewUnknownSpeaker(userId, embedding);
              confidence = 0.5; // Low confidence for new unknown
            }
          }

          // Insert speaker assignment
          await supabaseAdmin.from("comm_message_speakers").insert({
            comm_message_id: commMessageId,
            speaker_label: segment.speakerLabel,
            speaker_profile_id: speakerProfileId,
            unknown_speaker_id: unknownSpeakerId,
            confidence: confidence,
            embedding: embedding,
            transcript_segment: segment.transcript,
            start_time: segment.start,
            end_time: segment.end,
          });
        }
      }
    } catch (err) {
      console.error("[AudioIngest] Speaker identification failed:", err);
      // Don't fail the ingestion if speaker ID fails
    }
  }

  // 5. Extract responsibilities
  try {
    const responsibilities = await extractResponsibilitiesFromComms({
      body: transcript,
      subject: metadata?.title || null,
      fromIdentity: metadata?.participants?.join(", ") || "Unknown",
      toIdentity: "User",
      occurredAt,
      sourceType: "call", // Reuse call logic
    });

    if (responsibilities.length > 0) {
      await upsertResponsibilitiesForCommsMessage({
        userId,
        commMessageId,
        responsibilities,
      });
    }
  } catch (err) {
    console.error("[AudioIngest] Failed to extract responsibilities:", err);
  }

  // 6. Detect promises (treat as if user made commitments)
  try {
    // Check if transcript contains user commitments
    // We'll detect promises in both directions for audio
    const promises = await detectPromisesInCommsMessage({
      body: transcript,
      fromIdentity: "User",
      toIdentity: metadata?.participants?.join(", ") || "Unknown",
      occurredAt,
      direction: "outgoing", // User making promises
    });

    if (promises.length > 0) {
      await upsertPromisesForCommsMessage({
        userId,
        commMessageId,
        promises,
      });
    }
  } catch (err) {
    console.error("[AudioIngest] Failed to detect promises:", err);
  }

  // 7. Log contact interactions for each identified speaker
  try {
    const { logContactInteraction } = await import("@/lib/contacts/interactions");
    const { getContactIdFromCommMessage } = await import("@/lib/contacts/interactions");

    // Get contact ID from message
    const contactId = await getContactIdFromCommMessage(userId, commMessageId);

    if (contactId) {
      // Log interaction for each speaker segment
      for (const segment of segments) {
        // Find speaker profile for this segment
        const { data: speakerAssignment } = await supabaseAdmin
          .from("comm_message_speakers")
          .select("speaker_profile_id, voice_profiles(contact_id)")
          .eq("comm_message_id", commMessageId)
          .eq("speaker_label", segment.speakerLabel)
          .maybeSingle();

        const speakerContactId =
          speakerAssignment?.voice_profiles
            ? (speakerAssignment.voice_profiles as any).contact_id
            : contactId;

        if (speakerContactId) {
          await logContactInteraction({
            userId,
            contactId: speakerContactId,
            commMessageId,
            channelType: "audio",
            direction: "incoming", // Audio capture is typically incoming
            occurredAt,
            containsPromise: promises.length > 0,
          });
        }
      }

      // Also log overall interaction
      await logContactInteraction({
        userId,
        contactId,
        commMessageId,
        channelType: "audio",
        direction: "incoming",
        occurredAt,
        containsPromise: promises.length > 0,
      });
    }
  } catch (err) {
    console.error("[AudioIngest] Failed to log contact interaction:", err);
  }

  return commMessageId;
}

/**
 * Ingest audio with manual transcript (if transcription fails)
 */
export async function ingestAudioWithTranscript(params: {
  userId: string;
  audioUrl: string;
  transcript: string;
  durationSeconds: number;
  source: AudioIngestInput["source"];
  occurredAt: Date;
  metadata?: AudioIngestInput["metadata"];
}): Promise<string> {
  const { userId, audioUrl, transcript, durationSeconds, source, occurredAt, metadata } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Create channel
  const channelKey = `audio_capture_${source}`;
  const { data: existingChannel } = await supabaseAdmin
    .from("comm_channels")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("channel_type", "other")
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
        channel_type: "other",
        external_id: channelKey,
        label: metadata?.title || `Audio Capture (${source})`,
        audio_mode: true,
      })
      .select("id")
      .single();

    if (!newChannel) {
      throw new Error("Failed to create audio channel");
    }
    channelId = newChannel.id;
  }

  // Insert message
  const { data: message } = await supabaseAdmin
    .from("comm_messages")
    .insert({
      user_id: dbUserId,
      channel_id: channelId,
      source_type: "audio",
      external_id: audioUrl,
      direction: "incoming",
      from_identity: metadata?.participants?.join(", ") || "Unknown",
      to_identity: "User",
      occurred_at: occurredAt.toISOString(),
      subject: metadata?.title || `Audio Capture (${source})`,
      body: transcript,
      audio_url: audioUrl,
      raw_data: {
        duration_seconds: durationSeconds,
        source: source,
        metadata: metadata || {},
      },
    })
    .select("id")
    .single();

  if (!message) {
    throw new Error("Failed to create comm message");
  }

  const commMessageId = message.id;

  // Extract responsibilities and promises
  try {
    const responsibilities = await extractResponsibilitiesFromComms({
      body: transcript,
      subject: metadata?.title || null,
      fromIdentity: metadata?.participants?.join(", ") || "Unknown",
      toIdentity: "User",
      occurredAt,
      sourceType: "call",
    });

    if (responsibilities.length > 0) {
      await upsertResponsibilitiesForCommsMessage({
        userId,
        commMessageId,
        responsibilities,
      });
    }

    const promises = await detectPromisesInCommsMessage({
      body: transcript,
      fromIdentity: "User",
      toIdentity: metadata?.participants?.join(", ") || "Unknown",
      occurredAt,
      direction: "outgoing",
    });

    if (promises.length > 0) {
      await upsertPromisesForCommsMessage({
        userId,
        commMessageId,
        promises,
      });
    }
  } catch (err) {
    console.error("[AudioIngest] Failed to extract responsibilities/promises:", err);
  }

  return commMessageId;
}


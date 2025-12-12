// Comms Second Brain Integration
// lib/comms/second-brain.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

/**
 * Capture audio to Second Brain
 */
export async function captureAudioToSecondBrain(params: {
  userId: string;
  commMessageId: string;
}): Promise<string | null> {
  const { userId, commMessageId } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Load message
  const { data: message } = await supabaseAdmin
    .from("comm_messages")
    .select("*, comm_channels(*)")
    .eq("id", commMessageId)
    .eq("user_id", dbUserId)
    .single();

  if (!message) {
    throw new Error("Message not found");
  }

  const channel = message.comm_channels;

  // Summarize using existing logic
  const summaryPrompt = `Summarize this audio conversation/recording and extract key information:

Title: ${message.subject || "Audio Recording"}
Source: ${message.source_type}
Participants: ${message.from_identity || "Unknown"}
Occurred: ${message.occurred_at ? new Date(message.occurred_at).toLocaleString() : "Unknown"}

Transcript:
${message.body?.substring(0, 4000) || ""}

Provide:
1. A 2-3 sentence summary
2. Key entities: people, companies, topics, amounts, deadlines
3. Action items or commitments
4. Relevant tags (e.g. "audio", "conversation", topic, etc.)

Format as JSON:
{
  "summary": "string",
  "keyEntities": ["entity1", "entity2"],
  "actionItems": ["item1", "item2"],
  "tags": ["tag1", "tag2"]
}`;

  let summaryData: any;
  try {
    const { llmComplete } = await import("@/lib/llm/client");
    const summaryResponse = await llmComplete(summaryPrompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 500,
    });

    const cleaned = summaryResponse.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    summaryData = JSON.parse(cleaned);
  } catch (err) {
    console.error("[AudioSecondBrain] Failed to generate summary:", err);
    summaryData = {
      summary: `Audio recording: ${message.subject || "Untitled"}. ${message.body?.substring(0, 200) || ""}`,
      keyEntities: [],
      actionItems: [],
      tags: ["audio", "conversation"],
    };
  }

  // Create note
  const noteContent = `Audio Recording: ${message.subject || "Untitled"}

Summary:
${summaryData.summary}

Key Entities:
${summaryData.keyEntities.map((e: string) => `- ${e}`).join("\n")}

${summaryData.actionItems.length > 0 ? `Action Items:\n${summaryData.actionItems.map((a: string) => `- ${a}`).join("\n")}\n` : ""}

Message ID: ${commMessageId}
Occurred: ${message.occurred_at ? new Date(message.occurred_at).toLocaleString() : "Unknown"}`;

  try {
    const { upsertMemory } = await import("@/lib/third-brain/service");
    const noteId = await upsertMemory({
      userId: dbUserId,
      category: "audio",
      key: `audio_message_${commMessageId}`,
      content: noteContent,
      importance: 5,
      metadata: {
        commMessageId: commMessageId,
        sourceType: "audio",
        audioUrl: message.audio_url,
        tags: summaryData.tags,
        keyEntities: summaryData.keyEntities,
      },
    });

    return noteId;
  } catch (err) {
    console.error("[AudioSecondBrain] Failed to save to third brain:", err);
    // Fallback
    try {
      const { data: fragment } = await supabaseAdmin
        .from("tb_memory_fragments")
        .insert({
          user_id: dbUserId,
          content: noteContent,
          category: "audio",
          metadata: {
            type: "audio_recording",
            commMessageId: commMessageId,
            audioUrl: message.audio_url,
            tags: summaryData.tags,
          },
        })
        .select("id")
        .single();

      return fragment?.id || null;
    } catch (err2) {
      console.error("[AudioSecondBrain] Fallback also failed:", err2);
      return null;
    }
  }
}

/**
 * Capture comms thread to Second Brain
 */
export async function captureCommsThreadToSecondBrain(params: {
  userId: string;
  channelId: string;
}): Promise<string | null> {
  const { userId, channelId } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load channel and messages
  const { data: channel } = await supabaseAdmin
    .from("comm_channels")
    .select("*")
    .eq("id", channelId)
    .eq("user_id", dbUserId)
    .single();

  if (!channel) {
    throw new Error("Channel not found");
  }

  const { data: messages } = await supabaseAdmin
    .from("comm_messages")
    .select("*")
    .eq("channel_id", channelId)
    .order("occurred_at", { ascending: true });

  if (!messages || messages.length === 0) {
    throw new Error("No messages found in channel");
  }

  // 2. Load speaker assignments for audio messages
  const audioMessageIds = messages.filter((m) => m.source_type === "audio").map((m) => m.id);
  let speakerData: any = {};
  if (audioMessageIds.length > 0) {
    const { data: speakers } = await supabaseAdmin
      .from("comm_message_speakers")
      .select("comm_message_id, speaker_label, speaker_profile_id, unknown_speaker_id, transcript_segment, voice_profiles(contact_name), voice_unknown_speakers(label)")
      .in("comm_message_id", audioMessageIds);

    for (const speaker of speakers || []) {
      if (!speakerData[speaker.comm_message_id]) {
        speakerData[speaker.comm_message_id] = [];
      }
      const speakerName = speaker.voice_profiles?.contact_name || speaker.voice_unknown_speakers?.label || speaker.speaker_label;
      speakerData[speaker.comm_message_id].push({
        label: speaker.speaker_label,
        name: speakerName,
        segment: speaker.transcript_segment,
      });
    }
  }

  // 3. Summarize the conversation via LLM
  const conversationText = messages
    .map((m) => {
      let text = `${m.direction === "incoming" ? "From" : "To"}: ${m.from_identity || m.to_identity}\n`;
      
      // Add speaker labels for audio messages
      if (m.source_type === "audio" && speakerData[m.id]) {
        const speakers = speakerData[m.id];
        text += `Speakers: ${speakers.map((s: any) => s.name).join(", ")}\n`;
      }
      
      text += `${m.body || ""}`;
      return text;
    })
    .join("\n\n---\n\n");

  const summaryPrompt = `Summarize this ${channel.channel_type === "sms" ? "SMS" : channel.channel_type === "audio" ? "audio recording" : "phone call"} conversation and extract key information:

Contact: ${channel.label || channel.external_id}
Channel: ${channel.channel_type}
Messages: ${messages.length}

Conversation:
${conversationText.substring(0, 4000)}

Provide:
1. A 2-3 sentence summary of the conversation, using labeled speakers if available
2. Key entities: person, company, topics, amounts, deadlines
3. Action items or commitments (note which speaker made each commitment)
4. Relevant tags (e.g. "${channel.channel_type}", contact name, topic, etc.)

Format as JSON:
{
  "summary": "string (use speaker names if available, e.g. 'Sebrina said...', 'Matt promised...')",
  "keyEntities": ["entity1", "entity2"],
  "actionItems": ["item1", "item2"],
  "tags": ["tag1", "tag2"],
  "speakers": ["speaker1", "speaker2"]
}`;

  let summaryData: any;
  try {
    const summaryResponse = await llmComplete(summaryPrompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 500,
    });

    const cleaned = summaryResponse.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    summaryData = JSON.parse(cleaned);
  } catch (err) {
    console.error("[CommsSecondBrain] Failed to generate summary:", err);
    // Fallback summary
    const speakers = audioMessageIds.length > 0 && speakerData[audioMessageIds[0]]
      ? speakerData[audioMessageIds[0]].map((s: any) => s.name)
      : [];
    
    summaryData = {
      summary: `${channel.channel_type === "sms" ? "SMS" : channel.channel_type === "audio" ? "Audio recording" : "Call"} conversation with ${channel.label || channel.external_id}. ${messages.length} message${messages.length > 1 ? "s" : ""}.`,
      keyEntities: [channel.label || channel.external_id, ...speakers],
      actionItems: [],
      tags: [channel.channel_type, ...speakers],
      speakers: speakers,
    };
  }

  // 3. Create note in third brain
  const noteContent = `${channel.channel_type === "sms" ? "SMS" : "Call"} Conversation: ${channel.label || channel.external_id}

Summary:
${summaryData.summary}

Key Entities:
${summaryData.keyEntities.map((e: string) => `- ${e}`).join("\n")}

${summaryData.actionItems.length > 0 ? `Action Items:\n${summaryData.actionItems.map((a: string) => `- ${a}`).join("\n")}\n` : ""}

Channel ID: ${channelId}
Last message: ${messages[messages.length - 1]?.occurred_at ? new Date(messages[messages.length - 1].occurred_at).toLocaleString() : "Unknown"}
${summaryData.speakers && summaryData.speakers.length > 0 ? `Speakers: ${summaryData.speakers.join(", ")}` : ""}`;

  try {
    // Try to use third_brain_memories
    const { upsertMemory } = await import("@/lib/third-brain/service");
    const noteId = await upsertMemory({
      userId: dbUserId,
      category: channel.channel_type,
      key: `comms_channel_${channelId}`,
      content: noteContent,
      importance: 5,
          metadata: {
            channelId: channelId,
            channelType: channel.channel_type,
            contact: channel.label || channel.external_id,
            tags: summaryData.tags,
            keyEntities: summaryData.keyEntities,
            speakers: summaryData.speakers || [],
          },
    });

    return noteId;
  } catch (err) {
    console.error("[CommsSecondBrain] Failed to save to third brain:", err);
    // Fallback: try tb_memory_fragments
    try {
      const { data: fragment } = await supabaseAdmin
        .from("tb_memory_fragments")
        .insert({
          user_id: dbUserId,
          content: noteContent,
          category: channel.channel_type,
          metadata: {
            type: "comms_thread",
            channelId: channelId,
            channelType: channel.channel_type,
            contact: channel.label || channel.external_id,
            tags: summaryData.tags,
          },
        })
        .select("id")
        .single();

      return fragment?.id || null;
    } catch (err2) {
      console.error("[CommsSecondBrain] Fallback also failed:", err2);
      return null;
    }
  }
}


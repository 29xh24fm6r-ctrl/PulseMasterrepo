// Email Second Brain Integration
// lib/email/second-brain.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

/**
 * Capture email thread to Second Brain
 */
export async function captureEmailThreadToSecondBrain(params: {
  userId: string;
  threadId: string;
}): Promise<string | null> {
  const { userId, threadId } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Get thread and messages
  const { data: thread } = await supabaseAdmin
    .from("email_threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", dbUserId)
    .single();

  if (!thread) {
    throw new Error("Thread not found");
  }

  const { data: messages } = await supabaseAdmin
    .from("email_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true });

  if (!messages || messages.length === 0) {
    throw new Error("No messages found in thread");
  }

  // 2. Summarize the thread using LLM
  const messageText = messages
    .map(
      (m) =>
        `${m.is_incoming ? "From" : "To"}: ${m.from_address || "Unknown"}\n${m.body || m.snippet || ""}`
    )
    .join("\n\n---\n\n");

  const summaryPrompt = `Summarize this email thread and extract key information:

Subject: ${thread.subject}
Participants: ${thread.last_from} and others
Messages: ${messages.length}

Thread content:
${messageText.substring(0, 4000)}

Provide:
1. A 2-3 sentence summary of the thread
2. Key entities: people, companies, deals, amounts, deadlines
3. Action items or commitments
4. Relevant tags (e.g., "email", client name, "loan", "contract", etc.)

Format as JSON:
{
  "summary": "string",
  "keyEntities": ["entity1", "entity2"],
  "actionItems": ["item1", "item2"],
  "tags": ["tag1", "tag2"]
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
    console.error("[EmailSecondBrain] Failed to generate summary:", err);
    // Fallback summary
    summaryData = {
      summary: `Email thread: ${thread.subject}. ${messages.length} message${messages.length > 1 ? "s" : ""}.`,
      keyEntities: [thread.last_from],
      actionItems: [],
      tags: ["email"],
    };
  }

  // 3. Create note in third brain
  const noteContent = `Email Thread: ${thread.subject}

Summary:
${summaryData.summary}

Key Entities:
${summaryData.keyEntities.map((e: string) => `- ${e}`).join("\n")}

${summaryData.actionItems.length > 0 ? `Action Items:\n${summaryData.actionItems.map((a: string) => `- ${a}`).join("\n")}\n` : ""}

Thread ID: ${threadId}
Last message: ${thread.last_message_at ? new Date(thread.last_message_at).toLocaleString() : "Unknown"}`;

  try {
    // Try to use third_brain_memories
    const { upsertMemory } = await import("@/lib/third-brain/service");
    const noteId = await upsertMemory({
      userId: dbUserId,
      category: "email",
      key: `email_thread_${threadId}`,
      content: noteContent,
      importance: thread.importance === "critical" ? 9 : thread.importance === "high" ? 7 : 5,
      metadata: {
        threadId: threadId,
        subject: thread.subject,
        tags: summaryData.tags,
        keyEntities: summaryData.keyEntities,
      },
    });

    // Link note_id back to thread
    await supabaseAdmin
      .from("email_threads")
      .update({ note_id: noteId })
      .eq("id", threadId);

    return noteId;
  } catch (err) {
    console.error("[EmailSecondBrain] Failed to save to third brain:", err);
    // Fallback: try tb_memory_fragments
    try {
      const { data: fragment } = await supabaseAdmin
        .from("tb_memory_fragments")
        .insert({
          user_id: dbUserId,
          content: noteContent,
          category: "email",
          metadata: {
            type: "email_thread",
            threadId: threadId,
            subject: thread.subject,
            tags: summaryData.tags,
          },
        })
        .select("id")
        .single();

      if (fragment) {
        await supabaseAdmin
          .from("email_threads")
          .update({ note_id: fragment.id })
          .eq("id", threadId);
        return fragment.id;
      }
    } catch (err2) {
      console.error("[EmailSecondBrain] Fallback also failed:", err2);
    }

    return null;
  }
}


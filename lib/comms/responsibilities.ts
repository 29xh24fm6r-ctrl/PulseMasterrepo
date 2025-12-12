// Communications Responsibilities
// lib/comms/responsibilities.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import type { ResponsibilityCandidate } from "@/lib/email/responsibilities";
import { getUserEmailSettings } from "@/lib/email/settings";

/**
 * Extract responsibilities from SMS or call transcript
 */
export async function extractResponsibilitiesFromComms(message: {
  body: string;
  subject?: string | null;
  fromIdentity: string;
  toIdentity: string;
  occurredAt: Date;
  sourceType: "sms" | "call";
}): Promise<ResponsibilityCandidate[]> {
  const prompt = `Analyze this ${message.sourceType === "sms" ? "SMS message" : "phone call transcript"} and extract any responsibilities, obligations, or action items for the recipient.

${message.sourceType === "sms" ? "SMS" : "Call"}:
From: ${message.fromIdentity}
To: ${message.toIdentity}
${message.subject ? `Subject: ${message.subject}\n` : ""}Occurred: ${message.occurredAt.toISOString()}

Content:
${message.body.substring(0, 3000)}

Return a JSON array of responsibilities. Each responsibility should have:
{
  "responsibility_type": "action_request" | "deliverable" | "decision" | "information" | "risk" | "opportunity",
  "required_action": "short description of what needs to be done",
  "due_at": "ISO date string or null",
  "urgency": "low" | "normal" | "high" | "critical",
  "confidence": 0.0-1.0
}

Rules:
- Extract due dates from phrases like "by Friday", "within 2 days", "ASAP", "tomorrow", etc.
- urgency: "critical" for ASAP/urgent keywords, "high" for time-sensitive, "normal" for standard, "low" for optional
- confidence: how certain you are this is a real responsibility (0.0-1.0)

Return ONLY valid JSON array, no markdown, no explanation.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 800,
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as ResponsibilityCandidate[];

    // Validate and normalize
    return parsed
      .filter((r) => r.required_action && r.responsibility_type && r.confidence >= 0)
      .map((r) => ({
        ...r,
        due_at: r.due_at && typeof r.due_at === "string" ? new Date(r.due_at) : null,
        confidence: Math.max(0, Math.min(1, r.confidence || 0.5)),
        urgency: r.urgency || "normal",
      }));
  } catch (err) {
    console.error("[CommsResponsibilities] LLM extraction failed:", err);
    return [];
  }
}

/**
 * Upsert responsibilities for comms message
 */
export async function upsertResponsibilitiesForCommsMessage(params: {
  userId: string;
  commMessageId: string;
  responsibilities: ResponsibilityCandidate[];
}): Promise<void> {
  const { userId, commMessageId, responsibilities } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get message details for channel_id
  const { data: message } = await supabaseAdmin
    .from("comm_messages")
    .select("channel_id, source_type")
    .eq("id", commMessageId)
    .single();

  if (!message) {
    throw new Error("Comms message not found");
  }

  // Get user's task mode
  const settings = await getUserEmailSettings(userId);
  const taskMode = settings.task_mode;
  const confidenceThreshold = 0.75;

  for (const resp of responsibilities) {
    // Insert responsibility
    const { data: responsibility } = await supabaseAdmin
      .from("email_responsibilities")
      .insert({
        user_id: dbUserId,
        comm_message_id: commMessageId,
        responsibility_type: resp.responsibility_type,
        required_action: resp.required_action,
        due_at: resp.due_at?.toISOString() || null,
        urgency: resp.urgency || "normal",
        confidence: resp.confidence,
        status: "open",
      })
      .select()
      .single();

    // Create task for action-oriented responsibilities
    if (
      ["action_request", "deliverable", "decision"].includes(resp.responsibility_type) &&
      responsibility
    ) {
      // Determine task status based on confidence and mode
      let taskStatus: string;
      let autoCreated = false;

      if (resp.confidence < confidenceThreshold) {
        taskStatus = "suggested";
      } else {
        if (taskMode === "manual") {
          taskStatus = "suggested";
        } else if (taskMode === "assistive" || taskMode === "auto") {
          taskStatus = "open";
          autoCreated = true;
        } else {
          taskStatus = "suggested";
        }
      }

      // Check if task already exists
      const { data: existingTask } = await supabaseAdmin
        .from("email_tasks")
        .select("id")
        .eq("user_id", dbUserId)
        .is("thread_id", null)
        .eq("title", resp.required_action)
        .maybeSingle();

      if (!existingTask) {
        await supabaseAdmin.from("email_tasks").insert({
          user_id: dbUserId,
          thread_id: null, // No email thread for comms
          message_id: null,
          title: resp.required_action,
          description: `From ${message.source_type}: ${resp.responsibility_type}`,
          due_at: resp.due_at?.toISOString() || null,
          priority: resp.urgency || "normal",
          status: taskStatus,
          confidence: resp.confidence,
          auto_created: autoCreated,
        });
      }
    }
  }
}


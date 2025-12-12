// Email Responsibilities Engine
// lib/email/responsibilities.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

export type ResponsibilityType =
  | "action_request"
  | "deliverable"
  | "decision"
  | "information"
  | "risk"
  | "opportunity";

export interface ResponsibilityCandidate {
  responsibility_type: ResponsibilityType;
  required_action: string;
  due_at?: Date | null;
  urgency?: "low" | "normal" | "high" | "critical";
  confidence: number; // 0..1
}

export interface EmailMessageInput {
  subject: string;
  body: string;
  from: string;
  to: string[];
  sentAt: Date;
}

/**
 * Extract responsibilities from email using LLM
 */
export async function extractResponsibilitiesFromEmail(
  message: EmailMessageInput
): Promise<ResponsibilityCandidate[]> {
  const prompt = `Analyze this email and extract any responsibilities, obligations, or action items for the recipient.

Email:
Subject: ${message.subject}
From: ${message.from}
To: ${message.to.join(", ")}
Sent: ${message.sentAt.toISOString()}

Body (first 3000 chars):
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
- responsibility_type: "action_request" for explicit requests, "deliverable" for things to deliver, "decision" for decisions needed, "information" for info to provide, "risk" for risks to address, "opportunity" for opportunities
- Extract due dates from phrases like "by Friday", "within 2 days", "ASAP", etc.
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
    console.error("[EmailResponsibilities] LLM extraction failed:", err);
    return [];
  }
}

/**
 * Upsert responsibilities and create tasks
 */
export async function upsertResponsibilitiesForMessage(params: {
  userId: string;
  threadId: string;
  messageId: string;
  responsibilities: ResponsibilityCandidate[];
}): Promise<void> {
  const { userId, threadId, messageId, responsibilities } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get user's task mode
  const { data: settings } = await supabaseAdmin
    .from("user_email_settings")
    .select("task_mode")
    .eq("user_id", dbUserId)
    .maybeSingle();

  const taskMode = (settings?.task_mode || "manual") as "manual" | "assistive" | "auto";
  const confidenceThreshold = 0.75;

  for (const resp of responsibilities) {
    // Insert responsibility
    const { data: responsibility } = await supabaseAdmin
      .from("email_responsibilities")
      .insert({
        user_id: dbUserId,
        thread_id: threadId,
        message_id: messageId,
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
        .eq("thread_id", threadId)
        .eq("message_id", messageId)
        .eq("title", resp.required_action)
        .maybeSingle();

      if (!existingTask) {
        await supabaseAdmin.from("email_tasks").insert({
          user_id: dbUserId,
          thread_id: threadId,
          message_id: messageId,
          title: resp.required_action,
          description: `From email: ${resp.responsibility_type}`,
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


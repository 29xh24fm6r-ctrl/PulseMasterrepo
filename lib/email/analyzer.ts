// Email Analyzer
// lib/email/analyzer.ts

import { llmComplete } from "@/lib/llm/client";

export type EmailType =
  | "info"
  | "reply_required"
  | "task"
  | "calendar"
  | "newsletter";

export interface AnalyzedEmailResult {
  type: EmailType;
  priority: "low" | "normal" | "high" | "critical";
  requiresReply: boolean;
  replyDueAt?: Date | null;
  tasks: {
    title: string;
    description?: string;
    dueAt?: Date | null;
    priority?: "low" | "normal" | "high";
  }[];
}

export interface EmailMessageInput {
  subject: string;
  body: string;
  from: string;
  to: string[];
  sentAt: Date;
  isIncoming: boolean;
}

/**
 * Analyze email content using LLM
 */
export async function analyzeEmailContent(
  message: EmailMessageInput
): Promise<AnalyzedEmailResult> {
  const prompt = `Analyze this email and return a JSON object with the following structure:

{
  "type": "info" | "reply_required" | "task" | "calendar" | "newsletter",
  "priority": "low" | "normal" | "high" | "critical",
  "requiresReply": boolean,
  "replyDueAt": "ISO date string or null",
  "tasks": [
    {
      "title": "string",
      "description": "string or null",
      "dueAt": "ISO date string or null",
      "priority": "low" | "normal" | "high" or null
    }
  ]
}

Email details:
Subject: ${message.subject}
From: ${message.from}
To: ${message.to.join(", ")}
Sent: ${message.sentAt.toISOString()}
Is Incoming: ${message.isIncoming}

Body (first 2000 chars):
${message.body.substring(0, 2000)}

Rules:
- If sender explicitly asks a question or requests action → type: "reply_required", requiresReply: true
- If email contains deadlines, commitments, or action items → extract as tasks
- Priority: "critical" for urgent keywords, boss/key clients, or explicit urgency
- Priority: "high" for important contacts or time-sensitive content
- Priority: "normal" for regular business emails
- Priority: "low" for newsletters, promotions, automated messages
- If requiresReply is true, set replyDueAt to sentAt + 24 hours (or earlier if deadline mentioned)
- Extract any commitments like "I'll do X by Y" as tasks with dueAt

Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 500,
    });

    // Parse JSON response
    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as AnalyzedEmailResult;

    // Validate and normalize
    if (!parsed.type || !parsed.priority) {
      return getDefaultAnalysis(message);
    }

    // Convert replyDueAt string to Date if present
    if (parsed.replyDueAt && typeof parsed.replyDueAt === "string") {
      parsed.replyDueAt = new Date(parsed.replyDueAt);
    }

    // Convert task dueAt strings to Dates
    if (parsed.tasks) {
      parsed.tasks = parsed.tasks.map((task) => ({
        ...task,
        dueAt: task.dueAt && typeof task.dueAt === "string" ? new Date(task.dueAt) : null,
      }));
    }

    return parsed;
  } catch (err) {
    console.error("[EmailAnalyzer] LLM analysis failed:", err);
    return getDefaultAnalysis(message);
  }
}

/**
 * Default analysis fallback
 */
function getDefaultAnalysis(message: EmailMessageInput): AnalyzedEmailResult {
  // Heuristic fallback
  const subject = message.subject.toLowerCase();
  const body = message.body.toLowerCase();

  let type: EmailType = "info";
  let priority: "low" | "normal" | "high" | "critical" = "normal";
  let requiresReply = false;

  // Check for newsletter/promo keywords
  if (
    subject.includes("unsubscribe") ||
    subject.includes("newsletter") ||
    subject.includes("promo") ||
    subject.includes("sale")
  ) {
    type = "newsletter";
    priority = "low";
  }
  // Check for calendar keywords
  else if (subject.includes("meeting") || subject.includes("calendar") || subject.includes("invite")) {
    type = "calendar";
    priority = "normal";
  }
  // Check for task/request keywords
  else if (
    subject.includes("action") ||
    subject.includes("request") ||
    subject.includes("please") ||
    body.includes("can you") ||
    body.includes("could you")
  ) {
    type = "task";
    priority = "high";
    requiresReply = true;
  }
  // Check for question marks or explicit questions
  else if (subject.includes("?") || body.includes("?") || body.includes("let me know")) {
    type = "reply_required";
    requiresReply = true;
    priority = "normal";
  }

  // Priority heuristics
  if (subject.includes("urgent") || subject.includes("asap") || subject.includes("important")) {
    priority = "critical";
  } else if (subject.includes("re:") || subject.includes("fwd:")) {
    priority = "high";
  }

  const replyDueAt = requiresReply
    ? new Date(message.sentAt.getTime() + 24 * 60 * 60 * 1000) // +24 hours
    : null;

  return {
    type,
    priority,
    requiresReply,
    replyDueAt,
    tasks: [],
  };
}


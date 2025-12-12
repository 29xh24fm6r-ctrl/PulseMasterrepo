// Email Perception v3
// lib/agi/perception/email.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface EmailThreadSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName?: string;
  lastMessageAt: string;
  messageCount: number;
  priority: "low" | "normal" | "high" | "critical";
  isWaitingOnUser: boolean;
  isWaitingOnOthers: boolean;
  urgencyReason?: string;
}

export interface EmailPerception {
  urgentThreads: EmailThreadSummary[];
  waitingOnUser: EmailThreadSummary[];
  waitingOnOthers: EmailThreadSummary[];
  riskThreads: EmailThreadSummary[];
  opportunities: EmailThreadSummary[];
}

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

/**
 * Check if sender is important contact
 */
async function isImportantContact(userId: string, email: string): Promise<boolean> {
  const dbUserId = await resolveUserId(userId);

  try {
    // Check CRM/relationships for important contacts
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, importance_score")
      .eq("user_id", dbUserId)
      .or(`email.eq.${email},email_secondary.eq.${email}`)
      .maybeSingle();

    if (contact && (contact.importance_score || 0) > 70) {
      return true;
    }

    // Check relationship health
    const { data: relationship } = await supabaseAdmin
      .from("crm_relationship_health")
      .select("score")
      .eq("user_id", dbUserId)
      .eq("contact_email", email)
      .maybeSingle();

    if (relationship && (relationship.score || 0) > 70) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Analyze email thread for urgency
 */
function analyzeThreadUrgency(thread: any, subject: string, body: string): {
  priority: "low" | "normal" | "high" | "critical";
  urgencyReason?: string;
} {
  const subjectLower = subject.toLowerCase();
  const bodyLower = (body || "").toLowerCase();

  // Critical keywords
  if (
    subjectLower.includes("urgent") ||
    subjectLower.includes("asap") ||
    subjectLower.includes("emergency") ||
    bodyLower.includes("closing") ||
    bodyLower.includes("deadline today")
  ) {
    return { priority: "critical", urgencyReason: "urgent_language" };
  }

  // High priority keywords
  if (
    subjectLower.includes("important") ||
    subjectLower.includes("action required") ||
    subjectLower.includes("follow up") ||
    bodyLower.includes("need your response") ||
    bodyLower.includes("waiting on you")
  ) {
    return { priority: "high", urgencyReason: "important_keywords" };
  }

  // Deal-related
  if (
    subjectLower.includes("deal") ||
    subjectLower.includes("proposal") ||
    subjectLower.includes("contract") ||
    bodyLower.includes("loan") ||
    bodyLower.includes("closing")
  ) {
    return { priority: "high", urgencyReason: "deal_related" };
  }

  // Normal priority
  if (subjectLower.includes("re:") || subjectLower.includes("fwd:")) {
    return { priority: "normal", urgencyReason: "reply_forward" };
  }

  return { priority: "normal" };
}

/**
 * Build email perception for user
 */
export async function buildEmailPerception(userId: string): Promise<EmailPerception> {
  const dbUserId = await resolveUserId(userId);

  const perception: EmailPerception = {
    urgentThreads: [],
    waitingOnUser: [],
    waitingOnOthers: [],
    riskThreads: [],
    opportunities: [],
  };

  try {
    // Get recent email threads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: threads } = await supabaseAdmin
      .from("email_threads")
      .select(
        `
        id,
        subject,
        last_message_at,
        importance,
        email_messages (
          id,
          from_address,
          from_name,
          sent_at,
          is_incoming,
          body,
          snippet
        )
      `
      )
      .eq("user_id", dbUserId)
      .gte("last_message_at", sevenDaysAgo.toISOString())
      .order("last_message_at", { ascending: false })
      .limit(50);

    if (!threads || threads.length === 0) {
      return perception;
    }

    for (const thread of threads) {
      const messages = (thread.email_messages as any[]) || [];
      if (messages.length === 0) continue;

      const lastMessage = messages[messages.length - 1];
      const firstMessage = messages[0];
      const subject = thread.subject || "No Subject";
      const body = lastMessage.body || lastMessage.snippet || "";

      // Determine if waiting on user or others
      const isWaitingOnUser = lastMessage.is_incoming === true;
      const isWaitingOnOthers = lastMessage.is_incoming === false;

      // Analyze urgency
      const urgency = analyzeThreadUrgency(thread, subject, body);

      // Check if from important contact
      const fromEmail = lastMessage.from_address || "";
      const isImportant = await isImportantContact(userId, fromEmail);

      const threadSummary: EmailThreadSummary = {
        id: thread.id,
        threadId: thread.id,
        subject,
        from: fromEmail,
        fromName: lastMessage.from_name || fromEmail.split("@")[0],
        lastMessageAt: lastMessage.sent_at || thread.last_message_at,
        messageCount: messages.length,
        priority: isImportant && urgency.priority === "normal" ? "high" : urgency.priority,
        isWaitingOnUser,
        isWaitingOnOthers,
        urgencyReason: urgency.urgencyReason,
      };

      // Categorize
      if (urgency.priority === "critical" || (urgency.priority === "high" && isImportant)) {
        perception.urgentThreads.push(threadSummary);
      }

      if (isWaitingOnUser) {
        perception.waitingOnUser.push(threadSummary);
      }

      if (isWaitingOnOthers) {
        perception.waitingOnOthers.push(threadSummary);
      }

      // Risk threads: important contacts with no reply for >3 days
      if (isImportant && isWaitingOnOthers) {
        const daysSinceLastMessage =
          (Date.now() - new Date(threadSummary.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastMessage > 3) {
          perception.riskThreads.push(threadSummary);
        }
      }

      // Opportunities: new threads from important contacts or deal-related
      if (
        messages.length === 1 &&
        (isImportant || urgency.urgencyReason === "deal_related")
      ) {
        perception.opportunities.push(threadSummary);
      }
    }

    // Sort by priority and recency
    perception.urgentThreads.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    perception.waitingOnUser.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    perception.riskThreads.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  } catch (err: any) {
    console.warn("[Email Perception] Failed to build perception:", err.message);
  }

  return perception;
}




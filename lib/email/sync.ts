/**
 * Email Sync Service v1
 * lib/email/sync.ts
 * 
 * Syncs email metadata to Supabase and integrates with Third Brain
 */

import { supabaseAdmin } from "@/lib/supabase";
import { google } from "googleapis";
import { refreshAccessToken } from "@/app/lib/gmail-utils";

// ============================================
// TYPES
// ============================================

export interface EmailThread {
  id: string;
  userId: string;
  provider: string;
  threadId: string;
  subject: string;
  snippet?: string;
  lastMessageFrom?: string;
  lastMessageTo?: string;
  lastMessageAt?: Date;
  messageCount: number;
  unread: boolean;
  starred: boolean;
  importance: "low" | "normal" | "high" | "urgent";
  category: "primary" | "social" | "promotions" | "updates" | "forums";
  needsFollowup: boolean;
  followupReason?: string;
  labels: string[];
}

export interface EmailContact {
  id: string;
  userId: string;
  email: string;
  name?: string;
  domain?: string;
  importance: "low" | "normal" | "key" | "vip";
  relationship?: "colleague" | "client" | "vendor" | "personal" | "unknown";
  lastEmailAt?: Date;
  emailCount: number;
}

// ============================================
// GMAIL CLIENT
// ============================================

async function getGmailClient(userId: string) {
  // Get tokens from calendar_accounts or a dedicated gmail_accounts table
  const { data: account } = await supabaseAdmin
    .from("calendar_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (!account) return null;

  let accessToken = account.access_token;
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

  // Refresh if expired
  if (expiresAt && expiresAt.getTime() - 300000 < Date.now() && account.refresh_token) {
    const refreshed = await refreshAccessToken(account.refresh_token);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      await supabaseAdmin
        .from("calendar_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
        })
        .eq("user_id", userId)
        .eq("provider", "google");
    }
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Sync email threads metadata from Gmail to Supabase
 */
export async function syncEmailThreads(
  userId: string,
  options?: { maxResults?: number; daysBack?: number }
): Promise<{ synced: number; errors: number }> {
  const gmail = await getGmailClient(userId);
  if (!gmail) return { synced: 0, errors: 0 };

  const maxResults = options?.maxResults || 100;
  const daysBack = options?.daysBack || 7;
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

  let synced = 0;
  let errors = 0;

  try {
    // Get threads from Gmail
    const response = await gmail.users.threads.list({
      userId: "me",
      maxResults,
      q: `after:${afterTimestamp}`,
    });

    const threads = response.data.threads || [];

    for (const thread of threads) {
      if (!thread.id) continue;

      try {
        // Get thread details
        const threadDetail = await gmail.users.threads.get({
          userId: "me",
          id: thread.id,
          format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Date"],
        });

        const messages = threadDetail.data.messages || [];
        if (messages.length === 0) continue;

        const lastMessage = messages[messages.length - 1];
        const headers = lastMessage.payload?.headers || [];

        const from = headers.find((h) => h.name === "From")?.value || "";
        const to = headers.find((h) => h.name === "To")?.value || "";
        const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
        const dateStr = headers.find((h) => h.name === "Date")?.value;

        const labels = lastMessage.labelIds || [];
        const unread = labels.includes("UNREAD");
        const starred = labels.includes("STARRED");
        const important = labels.includes("IMPORTANT");

        // Determine category
        let category: EmailThread["category"] = "primary";
        if (labels.includes("CATEGORY_SOCIAL")) category = "social";
        else if (labels.includes("CATEGORY_PROMOTIONS")) category = "promotions";
        else if (labels.includes("CATEGORY_UPDATES")) category = "updates";
        else if (labels.includes("CATEGORY_FORUMS")) category = "forums";

        // Upsert to Supabase
        const { error } = await supabaseAdmin
          .from("email_threads")
          .upsert(
            {
              user_id: userId,
              provider: "gmail",
              thread_id: thread.id,
              subject,
              snippet: threadDetail.data.snippet,
              last_message_from: from,
              last_message_to: to,
              last_message_at: dateStr ? new Date(dateStr).toISOString() : null,
              message_count: messages.length,
              unread,
              starred,
              importance: important ? "high" : "normal",
              category,
              labels: labels.filter((l) => !l.startsWith("CATEGORY_")),
            },
            { onConflict: "user_id,provider,thread_id" }
          );

        if (error) {
          console.error("[EmailSync] Thread upsert error:", error);
          errors++;
        } else {
          synced++;
        }

        // Extract and upsert contact
        const { name, email } = parseFromField(from);
        if (email && !isAutomatedEmail(email)) {
          await upsertContact(userId, email, name);
        }
      } catch (err) {
        console.error("[EmailSync] Thread fetch error:", err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[EmailSync] Error:", err);
  }

  return { synced, errors };
}

/**
 * Upsert an email contact
 */
async function upsertContact(userId: string, email: string, name?: string): Promise<void> {
  const domain = email.split("@")[1] || "";

  const { data: existing } = await supabaseAdmin
    .from("email_contacts")
    .select("id, email_count")
    .eq("user_id", userId)
    .eq("email", email.toLowerCase())
    .single();

  if (existing) {
    await supabaseAdmin
      .from("email_contacts")
      .update({
        name: name || undefined,
        last_email_at: new Date().toISOString(),
        email_count: (existing.email_count || 0) + 1,
      })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("email_contacts").insert({
      user_id: userId,
      email: email.toLowerCase(),
      name,
      domain,
      importance: "normal",
      relationship: "unknown",
      last_email_at: new Date().toISOString(),
      email_count: 1,
    });
  }
}

// ============================================
// HELPERS
// ============================================

function parseFromField(from: string): { name: string; email: string } {
  const match = from.match(/^(?:"?([^"]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    const [, name, email] = match;
    return { name: name?.trim() || email.split("@")[0], email: email.toLowerCase() };
  }
  return { name: from, email: from.toLowerCase() };
}

function isAutomatedEmail(email: string): boolean {
  const patterns = [
    /^no[-_]?reply@/i,
    /^noreply@/i,
    /^notification[s]?@/i,
    /^alert[s]?@/i,
    /^update[s]?@/i,
    /^newsletter@/i,
    /^support@/i,
    /^billing@/i,
    /^marketing@/i,
  ];
  return patterns.some((p) => p.test(email));
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get email threads needing follow-up
 */
export async function getThreadsNeedingFollowup(userId: string): Promise<EmailThread[]> {
  const { data, error } = await supabaseAdmin
    .from("email_threads")
    .select("*")
    .eq("user_id", userId)
    .eq("needs_followup", true)
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data.map(mapThread);
}

/**
 * Get unread important threads
 */
export async function getUnreadImportant(userId: string): Promise<EmailThread[]> {
  const { data, error } = await supabaseAdmin
    .from("email_threads")
    .select("*")
    .eq("user_id", userId)
    .eq("unread", true)
    .in("importance", ["high", "urgent"])
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data.map(mapThread);
}

/**
 * Get key contacts
 */
export async function getKeyContacts(userId: string): Promise<EmailContact[]> {
  const { data, error } = await supabaseAdmin
    .from("email_contacts")
    .select("*")
    .eq("user_id", userId)
    .in("importance", ["key", "vip"])
    .order("last_email_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map(mapContact);
}

/**
 * Mark thread for follow-up
 */
export async function markThreadForFollowup(
  userId: string,
  threadId: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("email_threads")
    .update({
      needs_followup: true,
      followup_reason: reason,
    })
    .eq("user_id", userId)
    .eq("thread_id", threadId);

  return !error;
}

/**
 * Update contact importance
 */
export async function updateContactImportance(
  userId: string,
  email: string,
  importance: EmailContact["importance"]
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("email_contacts")
    .update({ importance })
    .eq("user_id", userId)
    .eq("email", email.toLowerCase());

  return !error;
}

// ============================================
// MAPPERS
// ============================================

function mapThread(row: any): EmailThread {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    threadId: row.thread_id,
    subject: row.subject,
    snippet: row.snippet,
    lastMessageFrom: row.last_message_from,
    lastMessageTo: row.last_message_to,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
    messageCount: row.message_count,
    unread: row.unread,
    starred: row.starred,
    importance: row.importance,
    category: row.category,
    needsFollowup: row.needs_followup,
    followupReason: row.followup_reason,
    labels: row.labels || [],
  };
}

function mapContact(row: any): EmailContact {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    domain: row.domain,
    importance: row.importance,
    relationship: row.relationship,
    lastEmailAt: row.last_email_at ? new Date(row.last_email_at) : undefined,
    emailCount: row.email_count,
  };
}
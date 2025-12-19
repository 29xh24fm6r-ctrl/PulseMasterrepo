import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface EmailThreadForContact {
  id: string;
  threadId: string;
  subject: string;
  snippet?: string;
  from: string;
  to: string;
  lastMessageAt: string;
  unread: boolean;
  starred: boolean;
  importance: "low" | "normal" | "high" | "urgent";
  category: "primary" | "social" | "promotions" | "updates" | "forums";
}

function looksLikeMissingColumn(message: string | undefined, col: string) {
  if (!message) return false;
  const m = message.toLowerCase();
  const c = col.toLowerCase();
  return m.includes("column") && m.includes(c) && m.includes("does not exist");
}

export async function getEmailThreadsForContact(opts: {
  dbUserId: string;
  email: string;
  limit?: number;
}): Promise<EmailThreadForContact[]> {
  const email = (opts.email || "").toLowerCase().trim();
  if (!email) return [];

  const limit = opts.limit ?? 25;

  // Attempt 1: hardened schema (preferred)
  {
    const { data, error } = await supabaseAdmin
      .from("email_threads")
      .select(
        "id, thread_id, subject, snippet, last_message_from, last_message_to, last_message_at, last_activity_at, unread, starred, importance, category"
      )
      .eq("user_id", opts.dbUserId)
      .eq("contact_email", email)
      .order("last_activity_at", { ascending: false })
      .limit(limit);

    if (!error) {
      return (data ?? []).map((t: any) => ({
        id: t.id,
        threadId: t.thread_id,
        subject: t.subject || "(No subject)",
        snippet: t.snippet || "",
        from: t.last_message_from || "",
        to: t.last_message_to || "",
        lastMessageAt:
          t.last_message_at || t.last_activity_at || new Date().toISOString(),
        unread: Boolean(t.unread),
        starred: Boolean(t.starred),
        importance: (t.importance || "normal") as EmailThreadForContact["importance"],
        category: (t.category || "primary") as EmailThreadForContact["category"],
      }));
    }

    // If missing new columns locally, fall through to Attempt 2
    if (
      !looksLikeMissingColumn(error.message, "last_activity_at") &&
      !looksLikeMissingColumn(error.message, "last_message_at") &&
      !looksLikeMissingColumn(error.message, "snippet")
    ) {
      console.error("[getEmailThreadsForContact] Error:", error);
      return [];
    }
  }

  // Attempt 2: older/minimal schema fallback (keeps UI alive if migrations didn't run)
  const { data, error } = await supabaseAdmin
    .from("email_threads")
    .select("id, thread_id, subject, last_email_at, updated_at, created_at")
    .eq("user_id", opts.dbUserId)
    .eq("contact_email", email)
    .order("last_email_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getEmailThreadsForContact] Error:", error);
    return [];
  }

  return (data ?? []).map((t: any) => ({
    id: t.id,
    threadId: t.thread_id,
    subject: t.subject || "(No subject)",
    snippet: "",
    from: "",
    to: "",
    lastMessageAt: t.last_email_at || t.updated_at || t.created_at || new Date().toISOString(),
    unread: false,
    starred: false,
    importance: "normal",
    category: "primary",
  }));
}


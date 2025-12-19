// lib/email/needsResponse.ts

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface NeedsResponseThread {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  from: string;
  to: string;
  occurredAt: string;
  unread: boolean;
  starred: boolean;
  importance: string;
  category: string;
  contactEmail: string | null;
}

/**
 * Get email threads that need response
 */
export async function getNeedsResponseThreads(opts: {
  clerkUserId: string;
  limit?: number;
}): Promise<NeedsResponseThread[]> {
  const limit = opts.limit ?? 25;

  // Try with owner_user_id first (preferred)
  {
    const { data, error } = await supabaseAdmin
      .from("email_threads")
      .select(
        "id, thread_id, subject, snippet, last_message_from, last_message_to, last_activity_at, last_message_at, unread, starred, importance, category, contact_email"
      )
      .eq("owner_user_id", opts.clerkUserId)
      .eq("needs_response", true)
      .order("last_activity_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      return (data ?? []).map((t: any) => ({
        id: t.id,
        threadId: t.thread_id || "",
        subject: t.subject || "(No subject)",
        snippet: t.snippet || "",
        from: t.last_message_from || "",
        to: t.last_message_to || "",
        occurredAt: t.last_activity_at || t.last_message_at || new Date().toISOString(),
        unread: Boolean(t.unread),
        starred: Boolean(t.starred),
        importance: t.importance || "normal",
        category: t.category || "primary",
        contactEmail: t.contact_email || null,
      }));
    }

    // If owner_user_id doesn't exist, fall through to user_id lookup
    if (error?.message?.includes("owner_user_id") || error?.message?.includes("does not exist")) {
      // Fall through to attempt 2
    } else if (error) {
      console.error("[getNeedsResponseThreads] Error:", error);
      return [];
    }
  }

  // Attempt 2: Use user_id (older schema) - need to resolve clerkUserId to dbUserId
  {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", opts.clerkUserId)
      .maybeSingle();

    if (!userRow?.id) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("email_threads")
      .select(
        "id, thread_id, subject, snippet, last_message_from, last_message_to, last_activity_at, last_message_at, unread, starred, importance, category, contact_email"
      )
      .eq("user_id", userRow.id)
      .eq("needs_response", true)
      .order("last_activity_at", { ascending: false })
      .limit(limit);

    if (error) {
      // If needs_response column doesn't exist, try needs_followup
      if (error.message?.includes("needs_response")) {
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from("email_threads")
          .select(
            "id, thread_id, subject, snippet, last_message_from, last_message_to, last_activity_at, last_message_at, unread, starred, importance, category, contact_email"
          )
          .eq("user_id", userRow.id)
          .eq("needs_followup", true)
          .order("last_activity_at", { ascending: false })
          .limit(limit);

        if (!fallbackError && fallbackData) {
          return (fallbackData ?? []).map((t: any) => ({
            id: t.id,
            threadId: t.thread_id || "",
            subject: t.subject || "(No subject)",
            snippet: t.snippet || "",
            from: t.last_message_from || "",
            to: t.last_message_to || "",
            occurredAt: t.last_activity_at || t.last_message_at || new Date().toISOString(),
            unread: Boolean(t.unread),
            starred: Boolean(t.starred),
            importance: t.importance || "normal",
            category: t.category || "primary",
            contactEmail: t.contact_email || null,
          }));
        }
      }
      console.error("[getNeedsResponseThreads] Error:", error);
      return [];
    }

    return (data ?? []).map((t: any) => ({
      id: t.id,
      threadId: t.thread_id || "",
      subject: t.subject || "(No subject)",
      snippet: t.snippet || "",
      from: t.last_message_from || "",
      to: t.last_message_to || "",
      occurredAt: t.last_activity_at || t.last_message_at || new Date().toISOString(),
      unread: Boolean(t.unread),
      starred: Boolean(t.starred),
      importance: t.importance || "normal",
      category: t.category || "primary",
      contactEmail: t.contact_email || null,
    }));
  }
}

/**
 * Resolve contact_id by email address
 */
export async function resolveContactIdByEmail(opts: {
  clerkUserId: string;
  email: string;
}): Promise<string | null> {
  const email = (opts.email || "").toLowerCase().trim();
  if (!email) return null;

  // Try with owner_user_id first
  {
    const { data, error } = await supabaseAdmin
      .from("contact_emails")
      .select("contact_id")
      .eq("owner_user_id", opts.clerkUserId)
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (!error && data?.contact_id) {
      return data.contact_id;
    }
  }

  // Fallback: resolve via users table
  {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", opts.clerkUserId)
      .maybeSingle();

    if (!userRow?.id) return null;

    const { data, error } = await supabaseAdmin
      .from("contact_emails")
      .select("contact_id")
      .eq("user_id", userRow.id)
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (!error && data?.contact_id) {
      return data.contact_id;
    }
  }

  return null;
}

/**
 * Create tasks from needs-response threads
 */
export async function createNeedsResponseTasks(opts: {
  clerkUserId: string;
  limit?: number;
}): Promise<{ created: number; skipped: number }> {
  const threads = await getNeedsResponseThreads({ clerkUserId: opts.clerkUserId, limit: opts.limit });

  let created = 0;
  let skipped = 0;

  for (const thread of threads) {
    // Check if task already exists
    let existingTask = null;

    // Attempt 1: Check by source_table + source_id
    {
      const { data, error } = await supabaseAdmin
        .from("crm_tasks")
        .select("id")
        .eq("owner_user_id", opts.clerkUserId)
        .eq("source_table", "email_threads")
        .eq("source_id", thread.threadId)
        .limit(1)
        .maybeSingle();

      if (!error && data?.id) {
        existingTask = data;
      }
    }

    // Attempt 2: If source_table/source_id don't exist, check by title pattern
    if (!existingTask) {
      const titlePattern = `Reply: ${thread.subject}`;
      const { data, error } = await supabaseAdmin
        .from("crm_tasks")
        .select("id")
        .eq("owner_user_id", opts.clerkUserId)
        .eq("title", titlePattern)
        .limit(1)
        .maybeSingle();

      if (!error && data?.id) {
        existingTask = data;
      }
    }

    // Attempt 3: Check if title contains thread ID marker
    if (!existingTask && thread.threadId) {
      const { data, error } = await supabaseAdmin
        .from("crm_tasks")
        .select("id")
        .eq("owner_user_id", opts.clerkUserId)
        .like("title", `%[thread:${thread.threadId}]%`)
        .limit(1)
        .maybeSingle();

      if (!error && data?.id) {
        existingTask = data;
      }
    }

    if (existingTask) {
      skipped++;
      continue;
    }

    // Resolve contact_id
    const contactId = thread.contactEmail
      ? await resolveContactIdByEmail({ clerkUserId: opts.clerkUserId, email: thread.contactEmail })
      : null;

    // Build task title (include thread marker if source_table doesn't exist)
    const baseTitle = `Reply: ${thread.subject}`;
    const titleWithMarker = contactId ? baseTitle : `${baseTitle} [thread:${thread.threadId}]`;

    // Calculate due date (1 day from now)
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 1);

    // Build insert payload
    const payload: any = {
      owner_user_id: opts.clerkUserId,
      title: titleWithMarker,
      status: "open",
      priority: 3, // high
      due_at: dueAt.toISOString(),
    };

    if (contactId) {
      payload.contact_id = contactId;
    }

    // Try to add source_table/source_id if columns exist
    {
      const { error } = await supabaseAdmin
        .from("crm_tasks")
        .insert({
          ...payload,
          source_table: "email_threads",
          source_id: thread.threadId,
        })
        .select("id")
        .single();

      if (!error) {
        created++;
        continue;
      }

      // If source_table doesn't exist, insert without it
      if (error?.message?.includes("source_table") || error?.message?.includes("does not exist")) {
        const { error: fallbackError } = await supabaseAdmin
          .from("crm_tasks")
          .insert(payload)
          .select("id")
          .single();

        if (!fallbackError) {
          created++;
        } else {
          console.error("[createNeedsResponseTasks] Failed to create task:", fallbackError);
          skipped++;
        }
      } else {
        console.error("[createNeedsResponseTasks] Failed to create task:", error);
        skipped++;
      }
    }
  }

  return { created, skipped };
}


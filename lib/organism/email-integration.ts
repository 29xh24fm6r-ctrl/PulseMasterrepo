/**
 * Email Integration with Organism Layer
 * Wires email sync to use unified organism services
 * lib/organism/email-integration.ts
 */

import { resolveIdentity, logInteraction } from "./index";

/**
 * Process a synced email and log it as an interaction
 * Call this after syncing emails from Gmail/Outlook
 */
export async function processEmailAsInteraction(
  userId: string,
  email: {
    from: string;
    fromName?: string;
    fromEmail?: string;
    to?: string | string[];
    subject: string;
    body: string;
    date: string;
    threadId?: string;
    messageId?: string;
    isIncoming: boolean;
  }
): Promise<{
  contact_id: string | null;
  interaction_id: string;
  resolution: any;
}> {
  // Step 1: Extract email address and name
  const emailAddress = email.fromEmail || email.from || "";
  const name = email.fromName || email.from.split("<")[0].trim() || "";

  // Extract email from "Name <email@example.com>" format
  const emailMatch = email.from.match(/<(.+?)>/);
  const cleanEmail = emailMatch ? emailMatch[1] : emailAddress;

  // Step 2: Resolve identity (prevents duplicates)
  const resolution = await resolveIdentity(userId, {
    email: cleanEmail,
    name: name || undefined,
  });

  // Step 3: Log interaction
  const interactionResult = await logInteraction(userId, {
    type: "email",
    contact_id: resolution.contact_id || undefined,
    occurred_at: email.date,
    subject: email.subject,
    summary: email.body.substring(0, 1000), // Truncate for summary
    channel: "email",
    metadata: {
      threadId: email.threadId,
      messageId: email.messageId,
      isIncoming: email.isIncoming,
      source_type: "email",
      source_id: email.messageId || email.threadId,
      full_body: email.body, // Store full body in metadata
      to: Array.isArray(email.to) ? email.to : email.to ? [email.to] : [],
    },
  });

  return {
    contact_id: resolution.contact_id,
    interaction_id: interactionResult.interaction_id,
    resolution,
  };
}

/**
 * Process multiple emails in batch
 */
export async function processEmailsAsInteractions(
  userId: string,
  emails: Array<{
    from: string;
    fromName?: string;
    fromEmail?: string;
    to?: string | string[];
    subject: string;
    body: string;
    date: string;
    threadId?: string;
    messageId?: string;
    isIncoming: boolean;
  }>
): Promise<{
  processed: number;
  contacts_created: number;
  interactions_created: number;
  errors: Array<{ email: string; error: string }>;
}> {
  let processed = 0;
  let contactsCreated = 0;
  let interactionsCreated = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const email of emails) {
    try {
      const result = await processEmailAsInteraction(userId, email);
      processed++;
      if (result.resolution.did_create_contact) {
        contactsCreated++;
      }
      interactionsCreated++;
    } catch (error: any) {
      errors.push({
        email: email.fromEmail || email.from,
        error: error.message || "Unknown error",
      });
    }
  }

  return {
    processed,
    contacts_created: contactsCreated,
    interactions_created: interactionsCreated,
    errors,
  };
}


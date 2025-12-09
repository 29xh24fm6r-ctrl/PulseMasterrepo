/**
 * Delegation Engine v1
 * lib/delegation/service.ts
 * 
 * AI-generated drafts for emails, messages, and notes
 * All drafts are user-reviewed before sending
 */

import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson } from "@/lib/ai/call";

// ============================================
// TYPES
// ============================================

export type DelegatedDraftType = "email" | "message" | "note";
export type DelegatedDraftStatus = "pending" | "approved" | "edited" | "sent" | "discarded";

export interface DelegatedDraft {
  id: string;
  userId: string;
  type: DelegatedDraftType;
  target: string | null;
  subject: string | null;
  body: string;
  relatedInsightId: string | null;
  context: Record<string, any> | null;
  status: DelegatedDraftStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DelegationRequestContext {
  userId: string;
  type: DelegatedDraftType;
  target?: string;
  purpose: string;
  extraContext?: Record<string, any>;
  relatedInsightId?: string;
}

export interface GeneratedDraft {
  id: string;
  type: DelegatedDraftType;
  target: string | null;
  subject: string | null;
  body: string;
}

interface AIGeneratedDraft {
  subject?: string;
  body: string;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Generate a delegated draft using AI
 */
export async function generateDelegatedDraft(
  ctx: DelegationRequestContext
): Promise<GeneratedDraft> {
  const { userId, type, target, purpose, extraContext, relatedInsightId } = ctx;

  // Get user context for personalization
  const userContext = await getUserContext(userId);

  // Generate draft with AI
  const aiResult = await callAIJson<AIGeneratedDraft>({
    userId,
    feature: "delegation_engine",
    systemPrompt: getSystemPrompt(type, userContext),
    userPrompt: buildUserPrompt(type, target, purpose, extraContext),
    maxTokens: 1000,
    temperature: 0.4,
  });

  if (!aiResult.success || !aiResult.data || !aiResult.data.body) {
    throw new Error(aiResult.error || "Failed to generate draft");
  }

  const draft = aiResult.data;

  // Save to database
  const { data, error } = await supabaseAdmin
    .from("delegated_drafts")
    .insert({
      user_id: userId,
      type,
      target: target || null,
      subject: draft.subject || null,
      body: draft.body,
      related_insight_id: relatedInsightId || null,
      context: extraContext || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Delegation] Error saving draft:", error);
    throw new Error("Failed to save draft");
  }

  return {
    id: data.id,
    type,
    target: target || null,
    subject: draft.subject || null,
    body: draft.body,
  };
}

/**
 * List delegated drafts for a user
 */
export async function listDelegatedDrafts(
  userId: string,
  status?: DelegatedDraftStatus,
  limit: number = 20
): Promise<DelegatedDraft[]> {
  let query = supabaseAdmin
    .from("delegated_drafts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("[Delegation] Error listing drafts:", error);
    return [];
  }

  return data.map(mapRowToDraft);
}

/**
 * Get a single draft by ID
 */
export async function getDelegatedDraft(
  draftId: string
): Promise<DelegatedDraft | null> {
  const { data, error } = await supabaseAdmin
    .from("delegated_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapRowToDraft(data);
}

/**
 * Update draft status
 */
export async function updateDraftStatus(
  draftId: string,
  status: DelegatedDraftStatus
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("delegated_drafts")
    .update({ status })
    .eq("id", draftId);

  return !error;
}

/**
 * Update draft content (for editing)
 */
export async function updateDraftContent(
  draftId: string,
  updates: { subject?: string; body?: string }
): Promise<boolean> {
  const updateData: any = { status: "edited" };
  if (updates.subject !== undefined) updateData.subject = updates.subject;
  if (updates.body !== undefined) updateData.body = updates.body;

  const { error } = await supabaseAdmin
    .from("delegated_drafts")
    .update(updateData)
    .eq("id", draftId);

  return !error;
}

/**
 * Delete a draft
 */
export async function deleteDelegatedDraft(draftId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("delegated_drafts")
    .delete()
    .eq("id", draftId);

  return !error;
}

/**
 * Get pending drafts count
 */
export async function getPendingDraftsCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("delegated_drafts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  return error ? 0 : (count || 0);
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Generate a follow-up email after a call
 */
export async function generateCallFollowUpEmail(
  userId: string,
  callContext: {
    contactName: string;
    contactEmail?: string;
    callSummary: string;
    actionItems?: string[];
    callId?: string;
  }
): Promise<GeneratedDraft> {
  return generateDelegatedDraft({
    userId,
    type: "email",
    target: callContext.contactEmail || callContext.contactName,
    purpose: `Follow up after call with ${callContext.contactName}. Call summary: ${callContext.callSummary}${
      callContext.actionItems?.length
        ? `. Action items: ${callContext.actionItems.join(", ")}`
        : ""
    }`,
    extraContext: {
      callId: callContext.callId,
      contactName: callContext.contactName,
      actionItems: callContext.actionItems,
    },
  });
}

/**
 * Generate a check-in message for a relationship
 */
export async function generateRelationshipCheckIn(
  userId: string,
  relationshipContext: {
    contactName: string;
    lastContactDays: number;
    relationship?: string;
    contactId?: string;
  }
): Promise<GeneratedDraft> {
  return generateDelegatedDraft({
    userId,
    type: "message",
    target: relationshipContext.contactName,
    purpose: `Casual check-in with ${relationshipContext.contactName}. Haven't connected in ${relationshipContext.lastContactDays} days. Keep it warm and genuine.`,
    extraContext: {
      contactId: relationshipContext.contactId,
      relationship: relationshipContext.relationship,
    },
  });
}

/**
 * Generate a personal reflection note
 */
export async function generateReflectionNote(
  userId: string,
  topic: string,
  relatedInsightId?: string
): Promise<GeneratedDraft> {
  return generateDelegatedDraft({
    userId,
    type: "note",
    purpose: `Personal reflection on: ${topic}. Make it thoughtful and introspective.`,
    relatedInsightId,
  });
}

// ============================================
// HELPERS
// ============================================

function mapRowToDraft(row: any): DelegatedDraft {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    target: row.target,
    subject: row.subject,
    body: row.body,
    relatedInsightId: row.related_insight_id,
    context: row.context,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function getUserContext(userId: string): Promise<{
  name?: string;
  role?: string;
  company?: string;
}> {
  try {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("name, role, company")
      .eq("user_id", userId)
      .single();

    return data || {};
  } catch {
    return {};
  }
}

function getSystemPrompt(
  type: DelegatedDraftType,
  userContext: { name?: string; role?: string; company?: string }
): string {
  const userName = userContext.name || "the user";
  const userRole = userContext.role ? ` (${userContext.role})` : "";
  const userCompany = userContext.company ? ` at ${userContext.company}` : "";

  const baseContext = `You are writing on behalf of ${userName}${userRole}${userCompany}.`;

  switch (type) {
    case "email":
      return `${baseContext}

Write professional but warm emails. Be concise and action-oriented.
- Use a friendly, professional tone
- Keep it brief (2-4 paragraphs max)
- Include clear next steps when relevant
- Don't be overly formal or stiff

Output ONLY valid JSON with "subject" and "body" fields.`;

    case "message":
      return `${baseContext}

Write short, casual messages suitable for text/chat.
- Keep it brief and conversational
- Sound natural and genuine
- Don't be overly formal
- Use appropriate warmth for the relationship

Output ONLY valid JSON with "body" field (no subject needed).`;

    case "note":
      return `${baseContext}

Write personal notes for reflection or documentation.
- Be thoughtful and introspective
- Capture key insights and feelings
- Keep it genuine and personal
- 1-3 paragraphs typically

Output ONLY valid JSON with "body" field.`;

    default:
      return `${baseContext} Write clear, helpful content. Output ONLY valid JSON with "body" field.`;
  }
}

function buildUserPrompt(
  type: DelegatedDraftType,
  target: string | undefined,
  purpose: string,
  extraContext?: Record<string, any>
): string {
  let prompt = "";

  if (type === "email") {
    prompt = `Write an email${target ? ` to ${target}` : ""}.

Purpose: ${purpose}`;

    if (extraContext) {
      prompt += `

Additional context:
${JSON.stringify(extraContext, null, 2)}`;
    }

    prompt += `

Output as JSON:
{
  "subject": "Email subject line",
  "body": "Email body with proper formatting"
}`;
  } else if (type === "message") {
    prompt = `Write a short message${target ? ` to ${target}` : ""}.

Purpose: ${purpose}`;

    if (extraContext) {
      prompt += `

Additional context:
${JSON.stringify(extraContext, null, 2)}`;
    }

    prompt += `

Output as JSON:
{
  "body": "The message content"
}`;
  } else {
    prompt = `Write a personal note.

Topic: ${purpose}`;

    if (extraContext) {
      prompt += `

Additional context:
${JSON.stringify(extraContext, null, 2)}`;
    }

    prompt += `

Output as JSON:
{
  "body": "The note content"
}`;
  }

  return prompt;
}

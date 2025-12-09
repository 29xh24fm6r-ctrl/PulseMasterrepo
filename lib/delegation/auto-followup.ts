/**
 * Auto-Followup Service v1
 * lib/delegation/auto-followup.ts
 * 
 * Automatically generates follow-up drafts after call events
 */

import { supabaseAdmin } from "@/lib/supabase";
import { callAIJson } from "@/lib/ai/call";

// ============================================
// TYPES
// ============================================

export interface AutoFollowupOptions {
  userId: string;
  eventId: string; // third_brain_events.id for the call
}

export interface AutoFollowupResult {
  draftId: string | null;
  skipped: boolean;
  reason?: string;
}

interface CallEventPayload {
  contact_name?: string;
  contact_email?: string;
  contact_id?: string;
  direction?: "inbound" | "outbound";
  summary?: string;
  notes?: string;
  action_items?: string[];
  duration_seconds?: number;
  call_id?: string;
}

interface GeneratedFollowup {
  should_send: boolean;
  type: "email" | "message";
  subject?: string;
  body: string;
  reason?: string;
}

// ============================================
// SETTINGS
// ============================================

// Minimum call duration (seconds) to trigger auto-followup
const MIN_CALL_DURATION = 60;

// Skip auto-followup if we already have a pending draft for this event
const SKIP_IF_DRAFT_EXISTS = true;

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Generate an auto-followup draft for a call event
 */
export async function generateAutoFollowupDraftForCall(
  opts: AutoFollowupOptions
): Promise<AutoFollowupResult> {
  const { userId, eventId } = opts;

  // 1. Fetch the call event
  const { data: event, error: eventError } = await supabaseAdmin
    .from("third_brain_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .eq("type", "call")
    .single();

  if (eventError || !event) {
    return { draftId: null, skipped: true, reason: "Call event not found" };
  }

  const payload = (event.raw_payload || {}) as CallEventPayload;

  // 2. Validation checks
  
  // Skip if no contact info
  if (!payload.contact_name && !payload.contact_email) {
    return { draftId: null, skipped: true, reason: "No contact info available" };
  }

  // Skip very short calls (likely voicemails or wrong numbers)
  if (payload.duration_seconds && payload.duration_seconds < MIN_CALL_DURATION) {
    return { draftId: null, skipped: true, reason: "Call too short" };
  }

  // 3. Check for existing draft for this event
  if (SKIP_IF_DRAFT_EXISTS) {
    const { data: existingDraft } = await supabaseAdmin
      .from("delegated_drafts")
      .select("id")
      .eq("user_id", userId)
      .eq("related_event_id", eventId)
      .limit(1)
      .single();

    if (existingDraft) {
      return { draftId: existingDraft.id, skipped: true, reason: "Draft already exists" };
    }
  }

  // 4. Generate the follow-up using AI
  const followup = await generateFollowupContent(userId, event, payload);

  if (!followup.should_send) {
    return { draftId: null, skipped: true, reason: followup.reason || "AI decided no follow-up needed" };
  }

  // 5. Create the draft
  const { data: draft, error: draftError } = await supabaseAdmin
    .from("delegated_drafts")
    .insert({
      user_id: userId,
      type: followup.type,
      target: payload.contact_email || payload.contact_name || "Unknown",
      subject: followup.subject || null,
      body: followup.body,
      related_event_id: eventId,
      related_insight_id: null,
      context: {
        call_id: payload.call_id,
        contact_id: payload.contact_id,
        contact_name: payload.contact_name,
        direction: payload.direction,
        auto_generated: true,
      },
      status: "pending",
      auto_generated: true,
    })
    .select("id")
    .single();

  if (draftError) {
    console.error("[AutoFollowup] Failed to create draft:", draftError);
    return { draftId: null, skipped: false, reason: "Failed to save draft" };
  }

  console.log(`[AutoFollowup] Created draft ${draft.id} for call event ${eventId}`);

  return { draftId: draft.id, skipped: false };
}

// ============================================
// AI GENERATION
// ============================================

async function generateFollowupContent(
  userId: string,
  event: any,
  payload: CallEventPayload
): Promise<GeneratedFollowup> {
  const contactName = payload.contact_name || "the contact";
  const direction = payload.direction || "unknown";
  const summary = payload.summary || event.summary || "No summary available";
  const actionItems = payload.action_items || [];

  const aiResult = await callAIJson<GeneratedFollowup>({
    userId,
    feature: "auto_followup",
    systemPrompt: `You are a professional assistant helping draft follow-up messages after phone calls.

Your job is to:
1. Decide if a follow-up is appropriate
2. If yes, generate a brief, professional follow-up

Guidelines:
- Keep it short (2-3 paragraphs max)
- Be warm but professional
- Reference key points from the call
- Include any action items if present
- If the call was very casual or no follow-up is needed, set should_send to false

Output ONLY valid JSON.`,
    userPrompt: `Generate a follow-up for this call:

Contact: ${contactName}
Direction: ${direction}
Summary: ${summary}
${actionItems.length > 0 ? `Action Items: ${actionItems.join(", ")}` : ""}

Determine if a follow-up is appropriate and generate content.

Output as JSON:
{
  "should_send": true/false,
  "type": "email" or "message",
  "subject": "Subject line (for emails only)",
  "body": "The follow-up message content",
  "reason": "Why no follow-up (if should_send is false)"
}`,
    maxTokens: 600,
    temperature: 0.4,
  });

  if (aiResult.success && aiResult.data) {
    return aiResult.data;
  }

  // Default: generate a simple follow-up
  return {
    should_send: true,
    type: "email",
    subject: `Following up on our call`,
    body: `Hi ${contactName},\n\nThank you for taking the time to speak with me today. I wanted to follow up on our conversation.\n\n${summary ? `We discussed: ${summary}\n\n` : ""}${actionItems.length > 0 ? `Next steps:\n${actionItems.map((item) => `- ${item}`).join("\n")}\n\n` : ""}Please let me know if you have any questions or if there's anything else I can help with.\n\nBest regards`,
  };
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Process recent calls that don't have follow-up drafts yet
 * Useful for catching up or running as a cron job
 */
export async function processRecentCallsForFollowups(
  userId: string,
  hoursBack: number = 24
): Promise<{ processed: number; draftsCreated: number }> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursBack);

  // Get recent call events without drafts
  const { data: events } = await supabaseAdmin
    .from("third_brain_events")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "call")
    .gte("occurred_at", cutoff.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(20);

  if (!events || events.length === 0) {
    return { processed: 0, draftsCreated: 0 };
  }

  let draftsCreated = 0;

  for (const event of events) {
    const result = await generateAutoFollowupDraftForCall({
      userId,
      eventId: event.id,
    });

    if (result.draftId && !result.skipped) {
      draftsCreated++;
    }
  }

  return { processed: events.length, draftsCreated };
}

// ============================================
// TRIGGER FUNCTION (to call after logging a call)
// ============================================

/**
 * Convenience function to trigger auto-followup after logging a call
 * Call this from your call transcription/logging endpoint
 */
export async function triggerAutoFollowupForCall(
  userId: string,
  eventId: string
): Promise<void> {
  // Run async - don't block the main request
  generateAutoFollowupDraftForCall({ userId, eventId })
    .then((result) => {
      if (result.draftId) {
        console.log(`[AutoFollowup] Draft created: ${result.draftId}`);
      } else if (result.skipped) {
        console.log(`[AutoFollowup] Skipped: ${result.reason}`);
      }
    })
    .catch((error) => {
      console.error("[AutoFollowup] Error:", error);
    });
}
// Deal Next Best Action Engine (Schema-Aligned)
// lib/deals/next-action.ts

import { loadDealContext } from "./context";
import { DealNextActionResult } from "./types";
import { llmComplete } from "@/lib/llm/client";
import { generateNextBestAction } from "@/lib/influence/engine";

/**
 * Generate next best action for a deal
 */
export async function generateDealNextAction(
  userId: string,
  dealId: string,
  options?: { situation?: string }
): Promise<DealNextActionResult> {
  // Load deal context
  const context = await loadDealContext(userId, dealId);
  
  if (!context) {
    throw new Error("Deal not found");
  }

  // Build LLM prompt
  const prompt = `You are Pulse, an AI assistant helping someone move a business deal forward.

Deal: ${context.deal.name}
Stage: ${context.deal.stage || "unknown"}
Status: ${context.deal.status || "active"}
${options?.situation ? `Context: ${options.situation}` : ""}

Participants:
${context.participants
  .map((p) => {
    return `- ${p.name}: ${p.role || "unknown"} (importance: ${((p.importance || 0.5) * 100).toFixed(0)}%)
  ${p.behaviorProfile?.prefers_channel ? `Prefers: ${p.behaviorProfile.prefers_channel}` : ""}
  ${p.relationshipScores?.trust_score ? `Trust: ${((p.relationshipScores.trust_score || 0.5) * 100).toFixed(0)}%` : ""}
  ${p.identityIntelSummary ? `Identity: ${p.identityIntelSummary.substring(0, 80)}` : ""}
  ${p.playbook?.do_list ? `DO: ${p.playbook.do_list.slice(0, 2).join(", ")}` : ""}`;
  })
  .join("\n")}

Recent Communications (last 5):
${context.comms.slice(0, 5).map((c) => `- ${c.channel} (${c.direction}): ${c.subjectOrSnippet.substring(0, 60)}`).join("\n") || "No recent communications"}

Open Tasks:
${context.tasks.map((t) => `- ${t.title} (${t.status})`).join("\n") || "No tasks"}

${context.lastIntel?.riskSummary ? `Latest Intelligence: ${context.lastIntel.riskSummary}` : ""}

Given this deal context, suggest the SINGLE most important next action to move this deal forward.

Choose:
1. Which participant to contact (use their name from Participants list)
2. Which channel (email, sms, call) - consider their preferences
3. What to say (full message ready to send)
4. Why this action matters

Return JSON:
{
  "actionSummary": "1-2 sentence summary",
  "targetContactName": "Contact name from Participants",
  "targetContactId": "contact_id or empty string",
  "suggestedChannel": "email" | "sms" | "call",
  "suggestedMessage": "Full message text",
  "rationale": "Why this action",
  "confidence": 0.0-1.0
}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 600,
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as any;

    // Find target contact ID if name provided
    let targetContactId = parsed.targetContactId || "";
    let targetContactName = parsed.targetContactName || "";
    
    if (!targetContactId && parsed.targetContactName) {
      const participant = context.participants.find(
        (p) => p.name === parsed.targetContactName
      );
      targetContactId = participant?.contactId || "";
      targetContactName = participant?.name || parsed.targetContactName;
    }

    // Validate and normalize
    return {
      actionSummary: parsed.actionSummary || "Take action to move deal forward",
      targetContactId: targetContactId || null,
      targetContactName: targetContactName || "Unknown",
      suggestedChannel: (["email", "sms", "call"].includes(parsed.suggestedChannel)
        ? parsed.suggestedChannel
        : "email") as "email" | "sms" | "call",
      suggestedMessage: parsed.suggestedMessage || "Hi, checking in on the deal. How are things?",
      rationale: parsed.rationale || "Based on deal context",
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    };
  } catch (err) {
    console.error("[DealNextAction] LLM generation failed:", err);
    // Fallback: use influence engine for first participant
    if (context.participants.length > 0 && context.participants[0].contactId) {
      try {
        const influenceAction = await generateNextBestAction({
          userId,
          contactId: context.participants[0].contactId,
          situation: `Deal: ${context.deal.name} - ${options?.situation || "Need to move forward"}`,
        });

        return {
          actionSummary: influenceAction.suggested_summary,
          targetContactName: context.participants[0].name || "Unknown",
          targetContactId: context.participants[0].contactId || null,
          suggestedChannel: influenceAction.suggested_channel as "email" | "sms" | "call",
          suggestedMessage: influenceAction.suggested_message,
          rationale: influenceAction.rationale,
          confidence: influenceAction.confidence,
        };
      } catch (influenceErr) {
        console.error("[DealNextAction] Influence engine fallback failed:", influenceErr);
      }
    }

    // Final fallback
    return {
      actionSummary: "Reach out to key participants to move deal forward",
      targetContactName: context.participants[0]?.name || "Unknown",
      targetContactId: context.participants[0]?.contactId || null,
      suggestedChannel: "email",
      suggestedMessage: `Hi, checking in on ${context.deal.name}. How are things progressing?`,
      rationale: "General follow-up to maintain momentum",
      confidence: 0.5,
    };
  }
}


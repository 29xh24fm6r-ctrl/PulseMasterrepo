// Deal Intelligence Generator (Schema-Aligned)
// lib/deals/intel.ts

import { supabaseAdmin } from "@/lib/supabase";
import { loadDealContext } from "./context";
import { DealIntelResult } from "./types";
import { llmComplete } from "@/lib/llm/client";

/**
 * Generate deal intelligence
 */
export async function generateDealIntelligence(
  userId: string,
  dealId: string
): Promise<DealIntelResult> {
  // Load deal context
  const context = await loadDealContext(userId, dealId);
  
  if (!context) {
    throw new Error("Deal not found");
  }

  // Build LLM prompt
  const prompt = `You are Pulse, an AI assistant analyzing a business deal to identify risks, blockers, and next steps.

Deal: ${context.deal.name}
${context.deal.description ? `Description: ${context.deal.description}` : ""}
Stage: ${context.deal.stage || "unknown"}
Status: ${context.deal.status || "active"}
Priority: ${context.deal.priority || "medium"}
${context.deal.value ? `Value: $${context.deal.value.toLocaleString()}` : ""}
${context.deal.dueDate ? `Due Date: ${context.deal.dueDate.toLocaleDateString()}` : ""}

Participants:
${context.participants
  .map((p) => {
    return `- ${p.name}: ${p.role || "unknown"} (importance: ${((p.importance || 0.5) * 100).toFixed(0)}%)
  ${p.behaviorProfile?.prefers_channel ? `Prefers: ${p.behaviorProfile.prefers_channel}` : ""}
  ${p.relationshipScores?.trust_score ? `Trust: ${((p.relationshipScores.trust_score || 0.5) * 100).toFixed(0)}%` : ""}
  ${p.identityIntelSummary ? `Identity: ${p.identityIntelSummary.substring(0, 100)}` : ""}`;
  })
  .join("\n")}

Recent Communications (last 15):
${context.comms
  .slice(0, 15)
  .map(
    (c) =>
      `- ${c.channel} (${c.direction}): ${c.subjectOrSnippet.substring(0, 80)} - ${c.occurredAt.toLocaleDateString()}`
  )
  .join("\n") || "No recent communications"}

Open Tasks:
${context.tasks.map((t) => `- ${t.title} (status: ${t.status}, due: ${t.dueAt ? t.dueAt.toLocaleDateString() : "no due date"})`).join("\n") || "No open tasks"}

${context.lastIntel?.riskSummary ? `Previous Risk Summary: ${context.lastIntel.riskSummary}` : ""}

Analyze this deal and provide:

1. Risk Summary: What are the main risks to this deal closing successfully? (2-3 sentences)
2. Blockers: What or who is blocking progress? (JSON array of {label, description})
3. Next Steps: What are the 3-7 most important actions to move this deal forward? (JSON array of {label, description})
4. Stall Indicators: What signs suggest this deal might be stalling? (JSON array of strings)
5. Momentum Score: 0-1 score indicating how much forward momentum this deal has
6. Confidence: 0-1 score indicating confidence in deal closing successfully

Return JSON:
{
  "riskSummary": "2-3 sentence summary of main risks",
  "blockers": [{"label": "string", "description": "string"}],
  "nextSteps": [{"label": "string", "description": "string"}],
  "stallIndicators": ["string", "string"],
  "momentumScore": 0.0-1.0,
  "confidence": 0.0-1.0
}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1000,
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as DealIntelResult;

    // Validate and normalize
    const result: DealIntelResult = {
      riskSummary: parsed.riskSummary || "Unable to assess risks at this time.",
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      stallIndicators: Array.isArray(parsed.stallIndicators) ? parsed.stallIndicators : [],
      momentumScore: Math.max(0, Math.min(1, parsed.momentumScore || 0.5)),
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    };

    // Upsert into database
    await supabaseAdmin
      .from("deal_intelligence")
      .upsert(
        {
          deal_id: dealId,
          risk_summary: result.riskSummary,
          blockers: result.blockers,
          next_steps: result.nextSteps,
          stall_indicators: result.stallIndicators,
          momentum_score: result.momentumScore,
          confidence: result.confidence,
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: "deal_id",
        }
      );

    return result;
  } catch (err) {
    console.error("[DealIntel] LLM generation failed:", err);
    // Return default intelligence
    return {
      riskSummary: "Unable to generate intelligence. Please review deal manually.",
      blockers: [],
      nextSteps: [],
      stallIndicators: [],
      momentumScore: 0.5,
      confidence: 0.5,
    };
  }
}


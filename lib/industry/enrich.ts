// Industry Enrichment Engine
// lib/industry/enrich.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";

/**
 * Enrich industry intelligence using web search and LLM
 */
export async function enrichIndustryIntel(
  industryName: string
): Promise<void> {
  // Check if already enriched recently
  const { data: existing } = await supabaseAdmin
    .from("industry_intel")
    .select("last_enriched_at")
    .eq("industry_name", industryName)
    .maybeSingle();

  if (existing?.last_enriched_at) {
    const lastEnriched = new Date(existing.last_enriched_at);
    const daysSince = (Date.now() - lastEnriched.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      // Skip if enriched in last 7 days
      return;
    }
  }

  // For now, we'll use LLM to generate industry intel
  // In production, you'd use web search APIs here
  const prompt = `You are Pulse, an AI assistant that provides industry intelligence.

Industry: ${industryName}

Generate comprehensive industry intelligence including:
1. Structure: value chain, sub-sectors
2. Key Roles: canonical jobs in this industry
3. Success Patterns: what top players do
4. Risk Patterns: common pitfalls
5. KPI Definitions: metrics that matter
6. Tool Stack: common tools/systems
7. Summary: human-readable overview

Return JSON:
{
  "structure": { "value_chain": [...], "sub_sectors": [...] },
  "key_roles": ["role1", "role2"],
  "success_patterns": ["pattern1", "pattern2"],
  "risk_patterns": ["risk1", "risk2"],
  "kpi_definitions": { "kpi1": "description", ... },
  "tool_stack": ["tool1", "tool2"],
  "summary": "2-3 paragraph overview"
}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete({
      messages: [
        {
          role: "system",
          content: "You are Pulse, an AI assistant that provides detailed industry intelligence.",
        },
        { role: "user", content: prompt },
      ],
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Upsert industry intel
    await supabaseAdmin
      .from("industry_intel")
      .upsert(
        {
          industry_name: industryName,
          structure: parsed.structure || {},
          key_roles: parsed.key_roles || [],
          success_patterns: parsed.success_patterns || [],
          risk_patterns: parsed.risk_patterns || [],
          kpi_definitions: parsed.kpi_definitions || {},
          tool_stack: parsed.tool_stack || [],
          summary: parsed.summary || "",
          last_enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "industry_name",
        }
      );
  } catch (err) {
    console.error("[IndustryEnrich] Failed:", err);
    throw err;
  }
}





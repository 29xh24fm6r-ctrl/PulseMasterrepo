/**
 * Intel Engine Orchestrator
 * Main entry point for running contact intel collection
 */

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildIdentityCard, IdentityCard } from "./identity";
import { braveSearch } from "./brave";
import { extractReadableText } from "./extract";
import { scoreCandidate } from "./entity-resolution";

export interface IntelRunOptions {
  userId: string;
  contactId: string;
  runType: "manual" | "scheduled" | "on_create" | "on_update" | "user_added";
}

export interface IntelRunResult {
  sourcesAdded: number;
  claimsAdded: number;
  runId: string;
  errors: Array<{ query: string; error: string }>;
}

/**
 * Run intel collection for a contact
 */
export async function runContactIntel(
  options: IntelRunOptions
): Promise<IntelRunResult> {
  const { userId, contactId, runType } = options;

  // Check intel_scope
  const { data: contact } = await supabaseAdmin
    .from("crm_contacts")
    .select("intel_scope")
    .eq("id", contactId)
    .eq("user_id", userId)
    .single();

  if (!contact || contact.intel_scope === "paused") {
    return {
      sourcesAdded: 0,
      claimsAdded: 0,
      runId: "",
      errors: [{ query: "intel_scope", error: "Intel collection is paused for this contact" }],
    };
  }

  // Create run record
  const { data: run, error: runError } = await supabaseAdmin
    .from("crm_intel_runs")
    .insert({
      user_id: userId,
      contact_id: contactId,
      run_type: runType,
      queries: [],
      results_count: 0,
      errors: [],
    })
    .select()
    .single();

  if (runError || !run) {
    console.error("[IntelEngine] Failed to create run record:", runError);
    return {
      sourcesAdded: 0,
      claimsAdded: 0,
      runId: "",
      errors: [{ query: "run_creation", error: runError?.message || "Unknown error" }],
    };
  }

  const runId = run.id;
  const errors: Array<{ query: string; error: string }> = [];
  let sourcesAdded = 0;
  let claimsAdded = 0;

  try {
    // Build identity card
    const identity = await buildIdentityCard(userId, contactId);

    // Construct queries
    const queries = buildQueries(identity);

    // Execute searches
    const allResults: Array<{ query: string; results: any[] }> = [];

    for (const query of queries) {
      try {
        const results = await braveSearch(query, 5); // Limit to 5 per query
        allResults.push({ query, results });
      } catch (err: any) {
        errors.push({ query, error: err.message || "Search failed" });
      }
    }

    // Process results
    const processedUrls = new Set<string>();

    for (const { query, results } of allResults) {
      for (const result of results) {
        // Skip if we've already processed this URL for this contact
        const urlKey = `${contactId}:${result.url}`;
        if (processedUrls.has(urlKey)) {
          continue;
        }
        processedUrls.add(urlKey);

        // Score candidate
        const resolution = scoreCandidate(identity, {
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          publisher: result.publisher,
        });

        // Store source (even if uncertain, user can review later)
        try {
          const { data: source, error: sourceError } = await supabaseAdmin
            .from("crm_contact_intel_sources")
            .upsert(
              {
                user_id: userId,
                contact_id: contactId,
                source_type: inferSourceType(result.url, result.title),
                url: result.url,
                title: result.title,
                publisher: result.publisher,
                snippet: result.snippet,
                published_at: result.published_at ? new Date(result.published_at).toISOString() : null,
                match_confidence: resolution.score,
                match_status: resolution.status,
                match_evidence: resolution.evidence,
              },
              {
                onConflict: "user_id,contact_id,url",
                ignoreDuplicates: false,
              }
            )
            .select()
            .single();

          if (!sourceError && source) {
            sourcesAdded++;

            // For verified/likely sources, extract text and create claims
            if (resolution.status === "verified" || resolution.status === "likely") {
              try {
                // Extract readable text
                const extracted = await extractReadableText(result.url, result.snippet);
                
                // Update source with extracted text
                await supabaseAdmin
                  .from("crm_contact_intel_sources")
                  .update({
                    extracted_text: extracted.text,
                    title: extracted.title || result.title,
                    author: extracted.author,
                    published_at: extracted.publishedAt || result.published_at ? new Date(result.published_at).toISOString() : null,
                  })
                  .eq("id", source.id);

                // Create basic claims from extracted text (heuristic for v1)
                if (extracted.text) {
                  const basicClaims = extractBasicClaims(identity, extracted.text, result.url);
                  
                  for (const claim of basicClaims) {
                    await supabaseAdmin
                      .from("crm_contact_intel_claims")
                      .insert({
                        user_id: userId,
                        contact_id: contactId,
                        category: claim.category,
                        claim: claim.claim,
                        source_url: result.url,
                        confidence: claim.confidence,
                        status: "active",
                      });
                    
                    claimsAdded++;
                  }
                }
              } catch (extractErr: any) {
                console.warn(`[IntelEngine] Failed to extract from ${result.url}:`, extractErr);
                // Continue - we have the snippet at least
              }
            }
          }
        } catch (sourceErr: any) {
          errors.push({ query, error: `Failed to store source: ${sourceErr.message}` });
        }
      }
    }

    // Update run record
    await supabaseAdmin
      .from("crm_intel_runs")
      .update({
        queries: queries,
        results_count: sourcesAdded,
        errors: errors,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      sourcesAdded,
      claimsAdded,
      runId,
      errors,
    };
  } catch (err: any) {
    console.error("[IntelEngine] Fatal error:", err);
    
    // Update run with error
    await supabaseAdmin
      .from("crm_intel_runs")
      .update({
        errors: [...errors, { query: "fatal", error: err.message || "Unknown error" }],
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      sourcesAdded,
      claimsAdded,
      runId,
      errors: [...errors, { query: "fatal", error: err.message || "Unknown error" }],
    };
  }
}

/**
 * Build search queries from identity card
 * Includes site-specific queries for LinkedIn, TikTok, Facebook, etc.
 */
function buildQueries(identity: IdentityCard): string[] {
  const queries: string[] = [];
  const name = identity.name || `${identity.firstName || ""} ${identity.lastName || ""}`.trim();

  if (!name) {
    return queries;
  }

  // Core identity queries
  queries.push(`"${name}"`);

  // Name + company (high priority)
  if (identity.companyName) {
    queries.push(`"${name}" "${identity.companyName}"`);
    queries.push(`"${name}" "${identity.companyName}" LinkedIn`);
  }

  // Site-specific queries (high priority for finding profiles)
  queries.push(`"${name}" site:linkedin.com/in`);
  if (identity.companyName) {
    queries.push(`"${name}" "${identity.companyName}" site:linkedin.com`);
  }
  queries.push(`"${name}" LinkedIn`);
  
  queries.push(`"${name}" TikTok`);
  queries.push(`"${name}" site:tiktok.com`);
  
  queries.push(`"${name}" Facebook`);
  queries.push(`"${name}" site:facebook.com`);

  // Name + job title
  if (identity.jobTitle) {
    queries.push(`"${name}" "${identity.jobTitle}"`);
  }

  // Name + email (if available)
  if (identity.email) {
    queries.push(`"${name}" ${identity.email}`);
  }

  // Name + podcast/interview
  queries.push(`"${name}" podcast OR interview`);
  queries.push(`"${name}" blog OR guest post`);

  // Company-specific queries
  if (identity.companyName) {
    queries.push(`"${identity.companyName}" leadership team "${name}"`);
    queries.push(`"${identity.companyName}" news`);
  }

  // Name + industry/keywords
  if (identity.industry) {
    queries.push(`"${name}" ${identity.industry}`);
  }

  if (identity.keywords && identity.keywords.length > 0) {
    queries.push(`"${name}" ${identity.keywords.slice(0, 3).join(" OR ")}`);
  }

  return queries.slice(0, 15); // Limit to 15 queries (increased for better coverage)
}

/**
 * Infer source type from URL and title
 */
function inferSourceType(url: string, title?: string): string {
  const urlLower = url.toLowerCase();
  const titleLower = (title || "").toLowerCase();

  if (urlLower.includes("linkedin.com") || urlLower.includes("linkedin")) {
    return "profile";
  }
  if (urlLower.includes("twitter.com") || urlLower.includes("x.com")) {
    return "profile";
  }
  if (titleLower.includes("podcast") || urlLower.includes("podcast")) {
    return "podcast";
  }
  if (titleLower.includes("interview")) {
    return "video";
  }
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return "video";
  }
  if (titleLower.includes("blog") || urlLower.includes("/blog/")) {
    return "blog";
  }
  if (urlLower.match(/news|article|press/)) {
    return "news";
  }
  
  return "other";
}

/**
 * Extract basic claims from text (heuristic - can be enhanced with LLM)
 */
function extractBasicClaims(
  identity: IdentityCard,
  text: string,
  sourceUrl: string
): Array<{ category: string; claim: string; confidence: number }> {
  const claims: Array<{ category: string; claim: string; confidence: number }> = [];
  const textLower = text.toLowerCase();
  const name = identity.name || `${identity.firstName || ""} ${identity.lastName || ""}`.trim();

  // Extract company/job mentions
  if (identity.companyName && textLower.includes(identity.companyName.toLowerCase())) {
    const context = extractContext(text, identity.companyName, 100);
    claims.push({
      category: "career",
      claim: `Works at ${identity.companyName}. ${context}`,
      confidence: 70,
    });
  }

  if (identity.jobTitle && textLower.includes(identity.jobTitle.toLowerCase())) {
    const context = extractContext(text, identity.jobTitle, 100);
    claims.push({
      category: "career",
      claim: `Holds position: ${identity.jobTitle}. ${context}`,
      confidence: 70,
    });
  }

  // Extract location mentions (simple heuristic)
  const locationPatterns = [
    /\b(lives?|located|based)\s+(in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[3]) {
      claims.push({
        category: "identity",
        claim: `Location: ${match[3]}`,
        confidence: 50,
      });
      break; // Only one location claim per source
    }
  }

  return claims;
}

/**
 * Extract context around a keyword in text
 */
function extractContext(text: string, keyword: string, maxLength: number): string {
  const index = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (index === -1) return "";

  const start = Math.max(0, index - maxLength / 2);
  const end = Math.min(text.length, index + keyword.length + maxLength / 2);
  
  let context = text.substring(start, end);
  
  // Clean up sentence boundaries
  if (start > 0) {
    const firstSpace = context.indexOf(" ");
    context = "..." + context.substring(firstSpace + 1);
  }
  if (end < text.length) {
    const lastPeriod = context.lastIndexOf(".");
    if (lastPeriod > context.length - 50) {
      context = context.substring(0, lastPeriod + 1);
    } else {
      context = context + "...";
    }
  }

  return context.trim();
}


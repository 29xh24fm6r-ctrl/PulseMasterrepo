/**
 * Brave Search Intelligence Layer
 * Fetches web intelligence and stores in Second Brain only
 * lib/intelligence/brave.ts
 */

import { IntelFinding } from "@/lib/organism/types";

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

interface BraveSearchResult {
  web: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      age?: string;
    }>;
  };
}

/**
 * Search Brave for entity intelligence
 */
export async function searchBrave(query: string): Promise<BraveSearchResult> {
  if (!BRAVE_API_KEY) {
    throw new Error("BRAVE_API_KEY environment variable not set");
  }

  const params = new URLSearchParams({
    q: query,
    count: "10",
    safesearch: "moderate",
    freshness: "py", // Past year
  });

  const response = await fetch(`${BRAVE_API_URL}?${params.toString()}`, {
    headers: {
      "X-Subscription-Token": BRAVE_API_KEY,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brave API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Extract facts and entities from search results
 * Returns structured IntelFinding format
 */
export function processBraveResults(
  query: string,
  results: BraveSearchResult
): IntelFinding[] {
  return results.web.results.map((result) => {
    // Simple entity extraction (can be enhanced with NLP)
    const entities: IntelFinding["entities"] = [];
    const extractedFacts: IntelFinding["extracted_facts"] = [];

    // Extract basic entities from title/description
    const text = `${result.title} ${result.description}`;
    
    // Look for common patterns (can be enhanced)
    if (text.match(/\b(CEO|CTO|Founder|Co-founder|President)\b/i)) {
      entities.push({
        type: "role",
        value: text.match(/\b(CEO|CTO|Founder|Co-founder|President)\b/i)?.[1] || "Executive",
      });
    }

    // Extract key facts (simple keyword extraction - can be enhanced with LLM)
    if (result.description.length > 50) {
      extractedFacts.push({
        key: "summary",
        value: result.description.substring(0, 200),
        confidence: 0.7,
      });
    }

    return {
      query,
      source_url: result.url,
      source_title: result.title,
      retrieved_at: new Date().toISOString(),
      snippet: result.description,
      extracted_facts: extractedFacts,
      entities,
    };
  });
}


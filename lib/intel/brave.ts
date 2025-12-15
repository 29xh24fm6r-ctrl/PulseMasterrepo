/**
 * Brave Search API Client
 * For public web intel gathering
 */

import "server-only";

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

export interface BraveSearchResult {
  url: string;
  title: string;
  snippet: string;
  publisher?: string;
  published_at?: string;
}

export interface BraveSearchResponse {
  web?: {
    results?: Array<{
      url: string;
      title: string;
      description: string;
      age?: string;
      meta_url?: {
        hostname?: string;
      };
    }>;
  };
}

/**
 * Search using Brave Search API
 * @param query - Search query string
 * @param limit - Maximum number of results (default 10, max 20)
 * @param freshness - Optional freshness filter: 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year)
 * @returns Array of search results
 */
export async function braveSearch(
  query: string,
  limit: number = 10,
  freshness?: 'pd' | 'pw' | 'pm' | 'py'
): Promise<BraveSearchResult[]> {
  if (!BRAVE_API_KEY) {
    console.warn("[BraveSearch] BRAVE_API_KEY not configured, returning empty results");
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: Math.min(limit, 20).toString(),
      search_lang: "en",
      safesearch: "moderate",
    });
    
    if (freshness) {
      params.append("freshness", freshness);
    }

    const response = await fetch(`${BRAVE_API_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
      // @ts-ignore - Next.js fetch cache options
      next: { revalidate: 300 }, // Cache for 5 minutes
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BraveSearch] API error ${response.status}:`, errorText);
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data: BraveSearchResponse = await response.json();
    const results = data.web?.results || [];

    return results.slice(0, Math.min(limit, 20)).map((result) => ({
      url: result.url,
      title: result.title,
      snippet: result.description,
      publisher: result.meta_url?.hostname,
      published_at: result.age ? parseAgeToISO(result.age) : undefined,
    }));
  } catch (err) {
    console.error("[BraveSearch] Error:", err);
    // Fail-soft: return empty array instead of throwing
    return [];
  }
}

/**
 * Parse Brave's age format (e.g., "2 days ago") to ISO date string
 * This is a best-effort parser
 */
function parseAgeToISO(age: string): string | undefined {
  // Brave returns relative times like "2 days ago", "1 week ago"
  // For now, we'll return undefined and let the extraction handle published_at from the page
  // TODO: Implement proper parsing if needed
  return undefined;
}


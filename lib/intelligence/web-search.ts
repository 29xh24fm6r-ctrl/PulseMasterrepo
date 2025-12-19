import "server-only";

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

// Add delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  snippet: string;
  age?: string;
  language?: string;
}

export interface WebSearchResponse {
  ok: boolean;
  results: WebSearchResult[];
  query: string;
  source: "brave" | "mock" | "mock-fallback" | "mock-error-fallback";
  total?: number;
  error?: string;
}

/**
 * Search the web using Brave Search API
 * Extracted from app/api/web-search/route.ts
 */
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  try {
    if (!query) {
      return {
        ok: false,
        results: [],
        query: "",
        source: "mock-error-fallback",
        error: "Missing query",
      };
    }

    if (!BRAVE_API_KEY) {
      console.warn("BRAVE_SEARCH_API_KEY not set, using mock data");
      const mockResults: WebSearchResult[] = [
        {
          title: `${query} - Information`,
          url: `https://example.com`,
          description: `Search results for ${query}`,
          snippet: "Information not available at this time.",
        },
      ];
      return {
        ok: true,
        results: mockResults,
        query,
        source: "mock",
      };
    }

    // Add small delay to avoid rate limits
    await delay(500);

    console.log(`🔍 Brave Search: ${query}`);
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(`Brave API error: ${response.status}`);
      // Return mock data on error
      const mockResults: WebSearchResult[] = [
        {
          title: `${query} - Information`,
          url: `https://example.com`,
          description: `Search results for ${query}`,
          snippet: "Information not available at this time.",
        },
      ];
      return {
        ok: true,
        results: mockResults,
        query,
        source: "mock-fallback",
      };
    }

    const data = await response.json();

    const results: WebSearchResult[] = (data.web?.results || []).map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description,
      snippet: result.description,
      age: result.age,
      language: result.language,
    }));

    console.log(`✅ Found ${results.length} results from Brave`);

    return {
      ok: true,
      results,
      query,
      source: "brave",
      total: results.length,
    };
  } catch (err: any) {
    console.error("Web search error:", err?.message ?? err);
    
    const queryForFallback = query || "search";
    const mockResults: WebSearchResult[] = [
      {
        title: `${queryForFallback} - Information`,
        url: `https://example.com`,
        description: `Search results for ${queryForFallback}`,
        snippet: "Information not available at this time.",
      },
    ];

    return {
      ok: true,
      results: mockResults,
      query: queryForFallback,
      source: "mock-error-fallback",
    };
  }
}


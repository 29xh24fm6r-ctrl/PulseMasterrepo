import { NextResponse } from "next/server";

// Add delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Missing query" },
        { status: 400 }
      );
    }

    if (!BRAVE_API_KEY) {
      console.warn("BRAVE_SEARCH_API_KEY not set, using mock data");
      const mockResults = [
        {
          title: `${query} - Information`,
          url: `https://example.com`,
          description: `Search results for ${query}`,
          snippet: "Information not available at this time.",
        },
      ];
      return NextResponse.json({
        ok: true,
        results: mockResults,
        query,
        source: "mock",
      });
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
      const mockResults = [
        {
          title: `${query} - Information`,
          url: `https://example.com`,
          description: `Search results for ${query}`,
          snippet: "Information not available at this time.",
        },
      ];
      return NextResponse.json({
        ok: true,
        results: mockResults,
        query,
        source: "mock-fallback",
      });
    }

    const data = await response.json();

    const results = (data.web?.results || []).map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description,
      snippet: result.description,
      age: result.age,
      language: result.language,
    }));

    console.log(`✅ Found ${results.length} results from Brave`);

    return NextResponse.json({
      ok: true,
      results,
      query,
      source: "brave",
      total: results.length,
    });
  } catch (err: any) {
    console.error("Web search error:", err?.message ?? err);

    // Get query from request body safely
    let queryForFallback = "search";
    try {
      const bodyText = await req.text();
      const parsed = JSON.parse(bodyText);
      queryForFallback = parsed.query || "search";
    } catch { }

    const mockResults = [
      {
        title: `${queryForFallback} - Information`,
        url: `https://example.com`,
        description: `Search results for ${queryForFallback}`,
        snippet: "Information not available at this time.",
      },
    ];

    return NextResponse.json({
      ok: true,
      results: mockResults,
      query: queryForFallback,
      source: "mock-error-fallback",
    });
  }
}
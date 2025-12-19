import { NextResponse } from "next/server";
import { searchWeb } from "@/lib/intelligence/web-search";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Missing query" },
        { status: 400 }
      );
    }

    // ✅ Use shared function instead of inline logic
    const result = await searchWeb(query);
    
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Web search error:", err?.message ?? err);
    
    // Get query from request body safely
    let queryForFallback = "search";
    try {
      const bodyText = await req.text();
      const parsed = JSON.parse(bodyText);
      queryForFallback = parsed.query || "search";
    } catch {}

    return NextResponse.json({
      ok: true,
      results: [{
        title: `${queryForFallback} - Information`,
        url: `https://example.com`,
        description: `Search results for ${queryForFallback}`,
        snippet: "Information not available at this time.",
      }],
      query: queryForFallback,
      source: "mock-error-fallback",
    });
  }
}
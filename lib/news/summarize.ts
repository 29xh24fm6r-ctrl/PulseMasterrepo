import "server-only";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

/**
 * Summarize article using LLM (if API key available)
 * Falls back to heuristic if not
 */
export async function summarizeArticle(
  title: string,
  content: string | null
): Promise<{ summary: string; key_points: string[] }> {
  // Fallback heuristic summary
  const fallbackSummary = content
    ? content.substring(0, 200) + (content.length > 200 ? "..." : "")
    : title;

  const fallbackKeyPoints = content
    ? extractKeyPoints(content, 4)
    : [title];

  if (!openai || !OPENAI_API_KEY) {
    console.log("[summarizeArticle] No OpenAI key, using heuristic");
    return {
      summary: fallbackSummary,
      key_points: fallbackKeyPoints,
    };
  }

  try {
    const prompt = `Summarize this news article concisely.

Title: ${title}
Content: ${content || "No content available"}

Provide:
1. A 2-3 sentence summary
2. 3-4 key bullet points (most important takeaways)

Format as JSON:
{
  "summary": "...",
  "key_points": ["...", "...", "..."]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || fallbackSummary,
        key_points: parsed.key_points || fallbackKeyPoints,
      };
    }

    return {
      summary: fallbackSummary,
      key_points: fallbackKeyPoints,
    };
  } catch (err) {
    console.error("[summarizeArticle] LLM error, using fallback:", err);
    return {
      summary: fallbackSummary,
      key_points: fallbackKeyPoints,
    };
  }
}

function extractKeyPoints(text: string, maxPoints: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences
    .filter((s) => s.length > 30 && s.length < 300)
    .slice(0, maxPoints)
    .map((s) => s.trim())
    .filter(Boolean);
}


import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Extract topics/keywords from article title + description
 * Simple keyword extraction (can be enhanced with LLM later)
 */
export function extractTopics(text: string): string[] {
  if (!text) return [];

  const lowerText = text.toLowerCase();
  const topics: string[] = [];

  // Common business/industry keywords
  const keywordMap: Record<string, string> = {
    // Financial
    "rate": "rates",
    "interest": "rates",
    "fed": "rates",
    "inflation": "economy",
    "recession": "economy",
    "gdp": "economy",
    
    // Real Estate
    "real estate": "cre",
    "commercial real estate": "cre",
    "cre": "cre",
    "property": "cre",
    "construction": "construction",
    
    // Labor
    "labor": "labor",
    "employment": "labor",
    "jobs": "labor",
    "wages": "labor",
    "workforce": "labor",
    
    // Small Business
    "small business": "small_business",
    "sba": "sba",
    "loan": "lending",
    "credit": "lending",
    "lending": "lending",
    
    // Industries
    "retail": "retail",
    "logistics": "logistics",
    "manufacturing": "manufacturing",
    "healthcare": "healthcare",
    "technology": "tech",
  };

  // Check for keywords
  for (const [pattern, topic] of Object.entries(keywordMap)) {
    if (lowerText.includes(pattern) && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  return topics;
}

/**
 * Extract key points from article (heuristic - can be enhanced with LLM)
 */
export function extractKeyPoints(text: string, maxPoints: number = 4): string[] {
  if (!text || text.length < 100) return [];

  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Filter meaningful sentences (length, keywords)
  const meaningful = sentences
    .filter((s) => s.length > 30 && s.length < 300)
    .slice(0, maxPoints);

  return meaningful.map((s) => s.trim()).filter(Boolean);
}


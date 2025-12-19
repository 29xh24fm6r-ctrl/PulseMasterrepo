import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Check if contact is a business contact
 */
export function isBusinessContact(contact: any): boolean {
  const businessTags = ["client", "prospect", "vendor", "business"];
  const tags = (contact.tags || []).map((t: string) => t.toLowerCase());
  
  return (
    contact.company_name ||
    businessTags.some((tag) => tags.includes(tag)) ||
    contact.type === "business" ||
    contact.type === "client" ||
    contact.type === "prospect"
  );
}

/**
 * Get keywords for a contact (from tags, facts, company, industry)
 */
export async function getContactKeywords(
  dbUserId: string,
  contactId: string
): Promise<string[]> {
  const keywords: string[] = [];

  // Get contact
  const { data: contact } = await supabaseAdmin
    .from("crm_contacts")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("id", contactId)
    .single();

  if (!contact) return [];

  // Add company name words
  if (contact.company_name) {
    keywords.push(...contact.company_name.toLowerCase().split(/\s+/));
  }

  // Add industry if available
  if (contact.type) {
    keywords.push(contact.type.toLowerCase());
  }

  // Add tags
  if (contact.tags && Array.isArray(contact.tags)) {
    keywords.push(...contact.tags.map((t: string) => t.toLowerCase()));
  }

  // Get facts with keywords
  const { data: facts } = await supabaseAdmin
    .from("contact_facts")
    .select("value_text, value_json")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .eq("key", "industry_keywords");

  if (facts && facts.length > 0) {
    facts.forEach((fact) => {
      if (fact.value_json && Array.isArray(fact.value_json)) {
        keywords.push(...fact.value_json.map((k: string) => k.toLowerCase()));
      }
      if (fact.value_text) {
        keywords.push(fact.value_text.toLowerCase());
      }
    });
  }

  // Get NAICS-derived keywords if available
  const { data: naicsFact } = await supabaseAdmin
    .from("contact_facts")
    .select("value_text")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .eq("key", "naics_code")
    .maybeSingle();

  if (naicsFact?.value_text) {
    // Simple NAICS to keywords mapping (can be enhanced)
    const naicsKeywords: Record<string, string[]> = {
      "531120": ["cre", "real estate"],
      "236220": ["construction", "commercial construction"],
      "541330": ["engineering", "construction"],
      "444130": ["hardware", "construction supplies"],
      "423320": ["electrical", "construction"],
    };
    const keywordsFromNaics = naicsKeywords[naicsFact.value_text] || [];
    keywords.push(...keywordsFromNaics);
  }

  return [...new Set(keywords)].filter(Boolean);
}

/**
 * Score article relevance for a contact
 */
export async function scoreArticleForContact(
  dbUserId: string,
  contactId: string,
  article: { title: string; content_text?: string | null; topics?: string[] | null }
): Promise<{ score: number; reason: string }> {
  // Get contact keywords
  const contactKeywords = await getContactKeywords(dbUserId, contactId);

  if (contactKeywords.length === 0) {
    return { score: 0, reason: "No keywords found for contact" };
  }

  // Get exclude keywords from preferences
  const { data: prefs } = await supabaseAdmin
    .from("contact_news_preferences")
    .select("exclude_keywords")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .maybeSingle();

  const excludeKeywords = (prefs?.exclude_keywords || []) as string[];

  // Combine article text
  const articleText = `${article.title} ${article.content_text || ""}`.toLowerCase();
  const articleTopics = (article.topics || []) as string[];

  // Check exclude keywords
  for (const exclude of excludeKeywords) {
    if (articleText.includes(exclude.toLowerCase())) {
      return { score: 0, reason: `Contains excluded keyword: ${exclude}` };
    }
  }

  // Score by keyword overlap
  let score = 0;
  const matchedKeywords: string[] = [];

  for (const keyword of contactKeywords) {
    if (articleText.includes(keyword)) {
      score += 2;
      matchedKeywords.push(keyword);
    }
    if (articleTopics.includes(keyword)) {
      score += 3; // Topic match is stronger
      matchedKeywords.push(keyword);
    }
  }

  // Recency boost (if published in last 7 days)
  // This will be handled in the orchestrator when checking published_at

  // Build reason
  const reason = matchedKeywords.length > 0
    ? `Matched keywords: ${matchedKeywords.slice(0, 3).join(", ")}`
    : "Low relevance";

  return { score, reason };
}


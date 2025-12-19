import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RSSFeedItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
}

interface ParsedRSS {
  items: RSSFeedItem[];
}

/**
 * Simple RSS parser (minimal, handles basic RSS 2.0)
 */
function parseRSS(xmlText: string): ParsedRSS {
  const items: RSSFeedItem[] = [];
  
  // Extract items using regex (simple, works for most RSS feeds)
  const itemMatches = xmlText.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
  
  for (const match of itemMatches) {
    const itemXml = match[1];
    const title = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const description = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const author = itemXml.match(/<author[^>]*>([\s\S]*?)<\/author>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    
    if (title && link) {
      items.push({ title, link, description, pubDate, author });
    }
  }
  
  return { items };
}

/**
 * Fetch RSS feed and parse items
 */
export async function fetchRSSFeed(url: string): Promise<RSSFeedItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Pulse OS News Bot/1.0)",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.error(`[fetchRSS] Failed to fetch ${url}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const parsed = parseRSS(xmlText);
    
    return parsed.items.slice(0, 20); // Limit to 20 most recent
  } catch (err) {
    console.error(`[fetchRSS] Error fetching ${url}:`, err);
    return [];
  }
}

/**
 * Fetch articles from all active RSS sources
 */
export async function fetchAllArticles(dbUserId: string): Promise<RSSFeedItem[]> {
  // Get active RSS sources (global + user-specific)
  const { data: sources } = await supabaseAdmin
    .from("news_sources")
    .select("*")
    .eq("active", true)
    .eq("type", "rss")
    .or(`user_id.is.null,user_id.eq.${dbUserId}`);

  if (!sources || sources.length === 0) {
    console.log("[fetchAllArticles] No active RSS sources found");
    return [];
  }

  const allArticles: RSSFeedItem[] = [];

  // Fetch from each source (with rate limiting)
  for (const source of sources) {
    try {
      const items = await fetchRSSFeed(source.url);
      items.forEach((item) => {
        allArticles.push({
          ...item,
          description: item.description || source.name, // Use source name as fallback
        });
      });
      
      // Rate limit: wait 500ms between sources
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[fetchAllArticles] Error fetching from ${source.name}:`, err);
    }
  }

  return allArticles;
}

/**
 * Cache article in database (check if exists first)
 */
export async function cacheArticle(article: RSSFeedItem, source: string): Promise<string | null> {
  try {
    // Check if already cached
    const { data: existing } = await supabaseAdmin
      .from("news_articles_cache")
      .select("id")
      .eq("url", article.link)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    // Parse published date
    let publishedAt: string | null = null;
    if (article.pubDate) {
      try {
        publishedAt = new Date(article.pubDate).toISOString();
      } catch {
        publishedAt = new Date().toISOString();
      }
    } else {
      publishedAt = new Date().toISOString();
    }

    // Insert new article
    const { data: cached, error } = await supabaseAdmin
      .from("news_articles_cache")
      .insert({
        url: article.link,
        title: article.title,
        source: source,
        published_at: publishedAt,
        author: article.author || null,
        content_text: article.description || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[cacheArticle] Error:", error);
      return null;
    }

    return cached.id;
  } catch (err) {
    console.error("[cacheArticle] Error:", err);
    return null;
  }
}


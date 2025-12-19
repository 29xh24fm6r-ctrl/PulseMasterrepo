import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAllArticles, cacheArticle } from "./fetch";
import { extractTopics, extractKeyPoints } from "./extract";
import { summarizeArticle } from "./summarize";
import { isBusinessContact, scoreArticleForContact, getContactKeywords } from "./match";

export interface DripRunReport {
  articlesFetched: number;
  articlesCached: number;
  articlesSummarized: number;
  recommendationsCreated: number;
  draftsCreated: number;
  contactsProcessed: number;
}

/**
 * Main orchestrator: fetch, cache, summarize, match, create recommendations + drafts
 */
export async function runNewsDripEngine(dbUserId: string): Promise<DripRunReport> {
  const report: DripRunReport = {
    articlesFetched: 0,
    articlesCached: 0,
    articlesSummarized: 0,
    recommendationsCreated: 0,
    draftsCreated: 0,
    contactsProcessed: 0,
  };

  try {
    // 1. Fetch articles from RSS sources
    console.log("[runNewsDripEngine] Fetching articles...");
    const articles = await fetchAllArticles(dbUserId);
    report.articlesFetched = articles.length;
    console.log(`[runNewsDripEngine] Fetched ${articles.length} articles`);

    // 2. Cache articles (deduplicate by URL)
    for (const article of articles) {
      const cachedId = await cacheArticle(article, article.description || "Unknown");
      if (cachedId) {
        report.articlesCached++;
      }
    }

    // 3. Get business contacts with news preferences enabled
    const { data: contacts } = await supabaseAdmin
      .from("crm_contacts")
      .select("*")
      .eq("user_id", dbUserId);

    const businessContacts = (contacts || []).filter(isBusinessContact);

    // Get their preferences
    const { data: prefs } = await supabaseAdmin
      .from("contact_news_preferences")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("enabled", true);

    const prefsMap = new Map((prefs || []).map((p) => [p.contact_id, p]));

    const enabledContacts = businessContacts.filter((c) => {
      const pref = prefsMap.get(c.id);
      return pref?.enabled !== false; // Default to enabled if no preference exists
    });

    report.contactsProcessed = enabledContacts.length;
    console.log(`[runNewsDripEngine] Processing ${enabledContacts.length} business contacts`);

    // 4. For each enabled contact, process recent articles
    for (const contact of enabledContacts) {
      const pref = prefsMap.get(contact.id);
      
      // Check throttling
      if (pref?.last_sent_at) {
        const daysSince = Math.floor(
          (Date.now() - new Date(pref.last_sent_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const maxPerWeek = pref.max_per_week || 1;
        
        // Check how many sent this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { count: sentThisWeek } = await supabaseAdmin
          .from("news_email_drafts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", dbUserId)
          .eq("contact_id", contact.id)
          .eq("status", "sent")
          .gte("sent_at", weekAgo.toISOString());

        if ((sentThisWeek || 0) >= maxPerWeek) {
          continue; // Skip this contact (already at limit)
        }
      }

      // Get recent articles (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentArticles } = await supabaseAdmin
        .from("news_articles_cache")
        .select("*")
        .gte("published_at", sevenDaysAgo.toISOString())
        .order("published_at", { ascending: false })
        .limit(50);

      // Check which articles already recommended/sent to this contact
      const { data: existingRecs } = await supabaseAdmin
        .from("news_recommendations")
        .select("article_url")
        .eq("user_id", dbUserId)
        .eq("contact_id", contact.id)
        .in("article_url", (recentArticles || []).map((a) => a.url));

      const existingUrls = new Set((existingRecs || []).map((r) => r.article_url));

      // Score and match articles
      for (const article of recentArticles || []) {
        if (existingUrls.has(article.url)) continue; // Already recommended

        // Summarize if not already done
        if (!article.summary || !article.key_points) {
          const summaryResult = await summarizeArticle(article.title, article.content_text);
          
          // Update cache with summary
          const topics = article.topics || extractTopics(article.title + " " + (article.content_text || ""));
          
          await supabaseAdmin
            .from("news_articles_cache")
            .update({
              summary: summaryResult.summary,
              key_points: summaryResult.key_points,
              topics,
            })
            .eq("id", article.id);

          report.articlesSummarized++;
        }

        // Score article for this contact
        const { score, reason } = await scoreArticleForContact(dbUserId, contact.id, article);

        if (score > 0) {
          // Create recommendation
          await supabaseAdmin.from("news_recommendations").insert({
            user_id: dbUserId,
            contact_id: contact.id,
            article_url: article.url,
            score,
            reason,
            status: "suggested",
          });

          report.recommendationsCreated++;

          // Auto-create draft (can be edited later)
          const draft = await generateEmailDraft(contact, article);
          
          await supabaseAdmin.from("news_email_drafts").insert({
            user_id: dbUserId,
            contact_id: contact.id,
            article_url: article.url,
            subject: draft.subject,
            body: draft.body,
            status: "draft",
          });

          report.draftsCreated++;
        }
      }
    }

    console.log("[runNewsDripEngine] Complete:", report);
    return report;
  } catch (err) {
    console.error("[runNewsDripEngine] Error:", err);
    return report;
  }
}

/**
 * Generate email draft for article + contact
 */
async function generateEmailDraft(
  contact: any,
  article: any
): Promise<{ subject: string; body: string }> {
  const companyName = contact.company_name || "your company";
  const contactName = contact.full_name || contact.first_name || "there";

  // Simple template (can be enhanced with LLM)
  const topics = (article.topics || []) as string[];
  const topicText = topics.length > 0 ? topics[0] : "this";

  const subject = `Thought this might matter for ${companyName}`;
  
  const keyPoints = (article.key_points || []) as string[];
  const bullets = keyPoints.slice(0, 3).map((p) => `  • ${p}`).join("\n");

  const body = `Hi ${contactName},

Saw this and thought it might be relevant to ${companyName} given your focus on ${topicText}:

${article.title || "Article"}
${article.summary || ""}

${bullets}

Curious how you're seeing this play out on your end?

${article.url}

Best,
[Your name]`;

  return { subject, body };
}


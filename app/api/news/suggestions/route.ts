import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get suggested recommendations with contact + article details
    const { data: recommendations, error: recError } = await supabaseAdmin
      .from("news_recommendations")
      .select(`
        *,
        contact:crm_contacts!inner(id, full_name, company_name, primary_email),
        draft:news_email_drafts!inner(id, subject, body, status)
      `)
      .eq("user_id", dbUserId)
      .eq("status", "suggested")
      .order("score", { ascending: false })
      .limit(50);

    if (recError) {
      console.error("[GetSuggestions] Error:", recError);
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }

    // Enrich with article details
    const articleUrls = [...new Set((recommendations || []).map((r: any) => r.article_url))];
    
    const { data: articles } = await supabaseAdmin
      .from("news_articles_cache")
      .select("*")
      .in("url", articleUrls);

    const articleMap = new Map((articles || []).map((a) => [a.url, a]));

    const suggestions = (recommendations || []).map((rec: any) => {
      const article = articleMap.get(rec.article_url);
      const draft = Array.isArray(rec.draft) ? rec.draft[0] : rec.draft;
      
      return {
        id: rec.id,
        contact: {
          id: rec.contact.id,
          name: rec.contact.full_name,
          company: rec.contact.company_name,
          email: rec.contact.primary_email,
        },
        article: article ? {
          url: article.url,
          title: article.title,
          source: article.source,
          published_at: article.published_at,
          summary: article.summary,
          key_points: article.key_points,
        } : null,
        recommendation: {
          score: rec.score,
          reason: rec.reason,
        },
        draft: draft ? {
          id: draft.id,
          subject: draft.subject,
          body: draft.body,
          status: draft.status,
        } : null,
      };
    });

    return NextResponse.json(
      { ok: true, suggestions },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GetSuggestions] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


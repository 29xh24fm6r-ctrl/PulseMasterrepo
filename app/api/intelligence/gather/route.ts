import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";
import OpenAI from "openai";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const SECOND_BRAIN_DB_RAW = process.env.NOTION_DATABASE_SECOND_BRAIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!NOTION_API_KEY || !OPENAI_API_KEY || !SECOND_BRAIN_DB_RAW) {
  throw new Error("Missing required environment variables");
}

const notion = new Client({ auth: NOTION_API_KEY });
const SECOND_BRAIN_DB = normalizeDatabaseId(SECOND_BRAIN_DB_RAW);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function getTitle(props: any, field: string = "Name"): string {
  const titleProp = props[field]?.title?.[0]?.plain_text;
  return titleProp || "Untitled";
}

function getText(props: any, field: string): string {
  return props[field]?.rich_text?.[0]?.plain_text || "";
}

async function searchWeb(query: string): Promise<any> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('Web search error:', err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { personId } = body;

    if (!personId) {
      return NextResponse.json(
        { ok: false, error: "Missing personId" },
        { status: 400 }
      );
    }

    const page = await notion.pages.retrieve({ page_id: personId });
    const props = (page as any).properties || {};

    const name = getTitle(props, "Name");
    const company = getText(props, "Company");
    const existingRawData = getText(props, "Raw Data");

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Person has no name" },
        { status: 400 }
      );
    }

    console.log(`🕵️ Intelligence Agent activated for: ${name} @ ${company}`);

    const intelligence: any = {
      searches: [],
      discoveries: [],
      timestamp: new Date().toISOString(),
    };

    console.log("🔍 Searching for LinkedIn profile...");
    const linkedInSearch = await searchWeb(`${name} ${company} LinkedIn profile`);
    if (linkedInSearch?.results) {
      intelligence.searches.push({
        query: "LinkedIn Profile",
        results: linkedInSearch.results.slice(0, 3),
      });
    }

    console.log("🔍 Searching for recent activity...");
    const activitySearch = await searchWeb(`${name} ${company} recent news posts`);
    if (activitySearch?.results) {
      intelligence.searches.push({
        query: "Recent Activity",
        results: activitySearch.results.slice(0, 3),
      });
    }

    console.log("🔍 Searching for company news...");
    const companySearch = await searchWeb(`${company} news recent updates`);
    if (companySearch?.results) {
      intelligence.searches.push({
        query: "Company News",
        results: companySearch.results.slice(0, 3),
      });
    }

    console.log("🔍 Searching for industry context...");
    const industrySearch = await searchWeb(`${company} industry trends challenges`);
    if (industrySearch?.results) {
      intelligence.searches.push({
        query: "Industry Context",
        results: industrySearch.results.slice(0, 3),
      });
    }

    console.log("🔍 Searching for social media...");
    const socialSearch = await searchWeb(`${name} Twitter X social media`);
    if (socialSearch?.results) {
      intelligence.searches.push({
        query: "Social Media",
        results: socialSearch.results.slice(0, 2),
      });
    }

    console.log("🧠 AI analyzing gathered intelligence...");

    const intelligenceSummary = intelligence.searches
      .map((search: any) => {
        const results = search.results
          .map((r: any) => `- ${r.title}: ${r.description || r.snippet || ""}`)
          .join("\n");
        return `**${search.query}:**\n${results}`;
      })
      .join("\n\n");

    const prompt = `You are an elite intelligence analyst. Analyze PUBLIC information about a person from web searches.

**TARGET:**
- Name: ${name}
- Company: ${company}

**GATHERED INTELLIGENCE:**
${intelligenceSummary}

**EXTRACT (keep responses CONCISE for Notion field limits):**

1. **Current Role** (1-2 sentences max)
2. **Recent Activity** (3 bullet points max, 10 words each)
3. **Pain Points** (3 bullet points max, 10 words each)
4. **Opportunities** (3 bullet points max, 10 words each)
5. **Communication Style** (1 sentence max)
6. **Conversation Starters** (3 items max, 15 words each)
7. **Red Flags** (2 items max if any)
8. **Best Approach** (1-2 sentences max)
9. **Key Insight** (1 sentence max - the ONE most important thing)
10. **Confidence Score** (0-100)

**FORMAT AS JSON:**
{
  "currentRole": "...",
  "recentActivity": ["...", "...", "..."],
  "painPoints": ["...", "...", "..."],
  "opportunities": ["...", "...", "..."],
  "communicationStyle": "...",
  "conversationStarters": ["...", "...", "..."],
  "redFlags": ["..."],
  "bestApproach": "...",
  "keyInsight": "...",
  "confidenceScore": 85
}

**CRITICAL:** Keep ALL responses SHORT. Only include info from search results. Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    let analysisText = completion.choices[0].message.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    console.log("💾 Updating Second Brain with fresh intelligence...");

    // Create COMPACT summary under 1900 chars
    const compactSummary = `
🕵️ ${new Date().toLocaleDateString()}

ROLE: ${(analysis.currentRole || "Unknown").substring(0, 150)}

RECENT: ${(analysis.recentActivity || []).slice(0, 2).join("; ").substring(0, 150)}

PAINS: ${(analysis.painPoints || []).slice(0, 2).join("; ").substring(0, 150)}

OPPS: ${(analysis.opportunities || []).slice(0, 2).join("; ").substring(0, 150)}

STYLE: ${(analysis.communicationStyle || "Unknown").substring(0, 100)}

STARTERS:
${(analysis.conversationStarters || []).slice(0, 3).map((s: string) => `• ${s.substring(0, 80)}`).join("\n")}

${(analysis.redFlags || []).length > 0 ? `⚠️ FLAGS: ${analysis.redFlags.slice(0, 2).join("; ").substring(0, 100)}` : ""}

APPROACH: ${(analysis.bestApproach || "TBD").substring(0, 150)}

💡 KEY: ${(analysis.keyInsight || "None").substring(0, 200)}

CONF: ${analysis.confidenceScore}%
`.trim().substring(0, 1900);

    await notion.pages.update({
      page_id: personId,
      properties: {
        "Raw Data": {
          rich_text: [{ text: { content: compactSummary } }],
        },
        "Last Intelligence Gather": {
          date: { start: new Date().toISOString() },
        },
      },
    });

    console.log("✅ Intelligence gathering complete!");

    return NextResponse.json({
      ok: true,
      analysis,
      sourcesFound: intelligence.searches.length,
      message: `Gathered intelligence from ${intelligence.searches.length} sources`,
    });
  } catch (err: any) {
    console.error("Intelligence gathering error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to gather intelligence",
      },
      { status: 500 }
    );
  }
}
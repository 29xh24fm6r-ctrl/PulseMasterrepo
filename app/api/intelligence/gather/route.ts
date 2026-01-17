import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContact, updateContact } from "@/lib/data/journal";

import { getOpenAI } from "@/services/ai/openai";

export const maxDuration = 60; // 1 minute timeout

async function searchWeb(query: string): Promise<any> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/web-search`, {
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { personId } = body;

    if (!personId) {
      return NextResponse.json(
        { ok: false, error: "Missing personId" },
        { status: 400 }
      );
    }

    const contact = await getContact(userId, personId);
    if (!contact) {
      return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }

    const name = contact.name;
    const company = contact.company || "";

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
    if (company) {
      const companySearch = await searchWeb(`${company} news recent updates`);
      if (companySearch?.results) {
        intelligence.searches.push({
          query: "Company News",
          results: companySearch.results.slice(0, 3),
        });
      }

      const industrySearch = await searchWeb(`${company} industry trends challenges`);
      if (industrySearch?.results) {
        intelligence.searches.push({
          query: "Industry Context",
          results: industrySearch.results.slice(0, 3),
        });
      }
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

**EXTRACT (keep responses CONCISE):**

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

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    let analysisText = completion.choices[0].message.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    console.log("💾 Updating Second Brain with fresh intelligence...");

    // Update context in Supabase contact
    await updateContact(userId, personId, {
      context: {
        // Merge with existing context handling is done in updateContact if generic, 
        // but updateContact might overwrite keys.
        // We pass the new fields we want to merge.
        currentRole: analysis.currentRole,
        recentActivity: analysis.recentActivity,
        painPoints: analysis.painPoints,
        opportunities: analysis.opportunities,
        communicationStyle: analysis.communicationStyle,
        conversationStarters: analysis.conversationStarters,
        redFlags: analysis.redFlags,
        bestApproach: analysis.bestApproach,
        keyInsight: analysis.keyInsight,
        confidenceScore: analysis.confidenceScore,
        lastIntelligenceGather: new Date().toISOString(),
        rawData: intelligenceSummary // Optional: store raw summaries
      }
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
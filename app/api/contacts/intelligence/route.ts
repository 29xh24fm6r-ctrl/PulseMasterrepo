import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/services/usage";
// POST /api/contacts/intelligence - Research a contact using AI and web search
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { getOpenAI } from "@/services/ai/openai";


// const openai = getOpenAI();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usageCheck = await canMakeAICall(userId, "contact_intelligence", 5);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const { contactId, name, email, company, linkedin } = await req.json();

    if (!name && !email && !company) {
      return NextResponse.json({ error: "Need at least name, email, or company" }, { status: 400 });
    }

    console.log(`🔍 Researching contact: ${name} at ${company} `);

    // Build search query
    const searchParts = [];
    if (name) searchParts.push(name);
    if (company) searchParts.push(company);
    if (linkedin) searchParts.push("LinkedIn");

    const searchQuery = searchParts.join(" ");

    // Try to find info using web search if available
    let webContext = "";

    // Use Brave Search if available
    if (process.env.BRAVE_API_KEY) {
      try {
        const searchRes = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`,
          {
            headers: {
              "Accept": "application/json",
              "X-Subscription-Token": process.env.BRAVE_API_KEY,
            },
          }
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const results = searchData.web?.results || [];
          webContext = results
            .slice(0, 3)
            .map((r: any) => `- ${r.title}: ${r.description}`)
            .join("\n");
        }
      } catch (e) {
        console.error("Web search failed:", e);
      }
    }

    // Generate intelligence with GPT
    const prompt = `You are a professional researcher helping a commercial loan officer prepare for meetings.

Research this contact and provide actionable intelligence:

CONTACT INFO:
- Name: ${name || "Unknown"}
- Email: ${email || "Unknown"}
- Company: ${company || "Unknown"}
- LinkedIn: ${linkedin || "Not provided"}

${webContext ? `WEB SEARCH RESULTS:\n${webContext}` : ""}

Provide intelligence in this JSON format:
{
  "summary": "2-3 sentence professional summary",
  "companyInfo": {
    "description": "What the company does",
    "industry": "Industry category",
    "size": "Company size estimate if known",
    "recentNews": "Any recent news or developments"
  },
  "personInfo": {
    "role": "Their likely role/responsibilities",
    "background": "Professional background if discoverable",
    "interests": "Professional interests or focus areas"
  },
  "talkingPoints": [
    "Suggested conversation topic 1",
    "Suggested conversation topic 2",
    "Suggested conversation topic 3"
  ],
  "potentialNeeds": [
    "Potential business need 1",
    "Potential business need 2"
  ],
  "warnings": ["Any red flags or things to be aware of"],
  "confidence": "high" | "medium" | "low"
}

Only respond with valid JSON. If you can't find information, make reasonable inferences based on the company/role and mark confidence as "low".`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";

    let intelligence;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      intelligence = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      intelligence = {
        summary: "Unable to gather intelligence",
        confidence: "low",
        talkingPoints: [],
        potentialNeeds: [],
      };
    }

    // Update contact with intelligence if contactId provided
    if (contactId) {
      await getSupabaseAdminRuntimeClient()
        .from("contacts")
        .update({
          ai_intel: intelligence,
          intel_updated_at: new Date().toISOString(),
        })
        .eq("id", contactId);
    }

    return NextResponse.json({
      ok: true,
      intelligence,
      searchQuery,
      hasWebResults: !!webContext,
    });

  } catch (err: any) {
    console.error("Intelligence error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
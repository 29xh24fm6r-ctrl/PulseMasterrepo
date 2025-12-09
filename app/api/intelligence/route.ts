import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import OpenAI from "openai";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

if (!NOTION_API_KEY) throw new Error("Missing NOTION_API_KEY");

const notion = new Client({ auth: NOTION_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ============================================
// Types
// ============================================

type SearchCategory = {
  category: string;
  icon: string;
  results: Array<{ title: string; description: string; url: string }>;
};

// ============================================
// Brave Search
// ============================================

async function searchBrave(query: string, count: number = 10): Promise<Array<{ title: string; description: string; url: string }>> {
  if (!BRAVE_API_KEY) {
    console.log("⚠️ No Brave API key - skipping web search");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Brave search error:", response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.web?.results || []).map((r: any) => ({
      title: r.title || "",
      description: r.description || "",
      url: r.url || "",
    }));
  } catch (err) {
    console.error("Brave search failed:", err);
    return [];
  }
}

// ============================================
// Research a Contact - Multi-Platform Deep Scan
// ============================================

async function researchContact(
  name: string,
  company: string | null,
  role: string | null,
  email: string | null,
  existingContext: string | null
): Promise<{ webResults: any[]; categorizedResults: SearchCategory[]; analysis: any; confidence: string }> {
  
  console.log(`🔍 Deep scanning: ${name} at ${company || "Unknown Company"}`);
  
  const categorizedResults: SearchCategory[] = [];
  const allResults: Array<{ title: string; description: string; url: string }> = [];
  
  // Helper to run a search and categorize results
  async function searchAndCategorize(query: string, category: string, icon: string) {
    console.log(`  ${icon} Searching: ${category}...`);
    const results = await searchBrave(query, 5);
    if (results.length > 0) {
      categorizedResults.push({ category, icon, results });
      allResults.push(...results);
    }
    await new Promise(r => setTimeout(r, 150)); // Rate limiting
  }
  
  // 1. LinkedIn - Professional profile
  await searchAndCategorize(
    `"${name}" ${company || ""} site:linkedin.com`,
    "LinkedIn",
    "💼"
  );
  
  // 2. Twitter/X - Opinions and communication style
  await searchAndCategorize(
    `"${name}" ${company || ""} site:twitter.com OR site:x.com`,
    "Twitter/X",
    "🐦"
  );
  
  // 3. YouTube - Video content, interviews
  await searchAndCategorize(
    `"${name}" ${company || ""} site:youtube.com`,
    "YouTube",
    "🎥"
  );
  
  // 4. GitHub - Technical projects (if relevant)
  if (role?.toLowerCase().includes("engineer") || 
      role?.toLowerCase().includes("developer") || 
      role?.toLowerCase().includes("technical") ||
      role?.toLowerCase().includes("cto") ||
      role?.toLowerCase().includes("founder")) {
    await searchAndCategorize(
      `"${name}" site:github.com`,
      "GitHub",
      "💻"
    );
  }
  
  // 5. Medium/Substack - Thought leadership
  await searchAndCategorize(
    `"${name}" ${company || ""} site:medium.com OR site:substack.com`,
    "Articles & Newsletters",
    "📝"
  );
  
  // 6. Podcasts - Interviews and quotes
  await searchAndCategorize(
    `"${name}" ${company || ""} podcast interview`,
    "Podcasts & Interviews",
    "🎙️"
  );
  
  // 7. News & Press - Media mentions
  await searchAndCategorize(
    `"${name}" ${company || ""} news announcement press`,
    "News & Press",
    "📰"
  );
  
  // 8. Company info
  if (company) {
    await searchAndCategorize(
      `${company} company news updates 2024 2025`,
      "Company News",
      "🏢"
    );
  }
  
  // 9. General professional presence
  await searchAndCategorize(
    `"${name}" ${company || ""} ${role || ""} professional`,
    "General Web",
    "🌐"
  );
  
  // 10. Speaking engagements / conferences
  await searchAndCategorize(
    `"${name}" ${company || ""} speaker conference keynote`,
    "Speaking & Events",
    "🎤"
  );
  
  // Dedupe all results
  const uniqueResults = allResults.filter((r, i, arr) => 
    arr.findIndex(x => x.url === r.url) === i
  );
  
  console.log(`📊 Found ${uniqueResults.length} results across ${categorizedResults.length} platforms`);
  
  // AI Analysis with richer context
  const analysis = await analyzeContactWithAI(name, company, role, email, uniqueResults, existingContext, categorizedResults);
  
  // Determine confidence based on results
  let confidence: "low" | "medium" | "high" = "low";
  if (uniqueResults.length >= 15) confidence = "high";
  else if (uniqueResults.length >= 8) confidence = "medium";
  
  return {
    webResults: uniqueResults,
    categorizedResults,
    analysis,
    confidence,
  };
}

// ============================================
// AI Analysis - Enhanced with Social Media Context
// ============================================

async function analyzeContactWithAI(
  name: string,
  company: string | null,
  role: string | null,
  email: string | null,
  webResults: Array<{ title: string; description: string; url: string }>,
  existingContext: string | null,
  categorizedResults?: SearchCategory[]
): Promise<any> {
  
  // Build rich context from categorized results
  let searchContext = "";
  
  if (categorizedResults && categorizedResults.length > 0) {
    searchContext = categorizedResults.map(cat => {
      const results = cat.results.map((r, i) => `  ${i + 1}. ${r.title}\n     ${r.description}`).join("\n");
      return `${cat.icon} ${cat.category.toUpperCase()}:\n${results}`;
    }).join("\n\n");
  } else if (webResults.length > 0) {
    searchContext = webResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`).join("\n\n");
  } else {
    searchContext = "No web results found.";
  }
  
  const prompt = `You are an elite relationship intelligence analyst. Your job is to help me deeply understand a person so I can communicate with them effectively, anticipate their needs, and build a strong relationship.

PERSON TO ANALYZE:
- Name: ${name}
- Company: ${company || "Unknown"}
- Role: ${role || "Unknown"}
- Email: ${email || "Unknown"}

${existingContext ? `EXISTING RELATIONSHIP CONTEXT:\n${existingContext}\n` : ""}

MULTI-PLATFORM RESEARCH RESULTS:
${searchContext}

Based on ALL available information from LinkedIn, Twitter, YouTube, articles, podcasts, news, and other sources, create a comprehensive psychological and professional profile. 

PAY SPECIAL ATTENTION TO:
- LinkedIn: Career trajectory, skills, professional positioning
- Twitter/X: Personal opinions, communication style, interests
- YouTube/Podcasts: How they speak, what topics they discuss
- Articles: What they think about, thought leadership
- News: Recent company events, achievements, challenges

RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "background": "2-3 sentence summary of who they are professionally",
  
  "professionalFocus": [
    "Their top 3-5 professional priorities or areas of focus"
  ],
  
  "communicationStyle": "How they prefer to communicate based on their social media presence (direct/detailed, formal/casual, data-driven/relationship-driven, emoji user, long-form writer, etc.)",
  
  "likelyConcerns": [
    "What's probably keeping them up at night professionally",
    "Challenges they likely face in their role",
    "Pressures from their industry or position"
  ],
  
  "motivations": [
    "What drives them professionally",
    "What success looks like to them",
    "What they're trying to achieve"
  ],
  
  "decisionMakingStyle": "How they likely make decisions (analytical, intuitive, consensus-driven, fast/slow, risk-tolerant/risk-averse)",
  
  "onlinePresence": "Summary of their social media activity - are they active on Twitter? Do they write articles? Appear on podcasts? What platforms do they engage with most?",
  
  "contentThemes": [
    "Topics they frequently discuss or post about",
    "Themes in their content",
    "Areas of expertise they showcase"
  ],
  
  "industryIntelligence": {
    "sector": "Their industry/sector name",
    "currentTrends": [
      "3-5 major trends currently affecting their industry",
      "What's changing in their market right now"
    ],
    "recentDisruptions": [
      "Recent news, regulations, or events impacting their industry",
      "Market shifts they're likely dealing with"
    ],
    "commonChallenges": [
      "Challenges that most companies in their industry face",
      "Pain points specific to their sector"
    ],
    "opportunities": [
      "Growth opportunities in their market",
      "Areas where smart companies are investing"
    ],
    "competitors": [
      "Key competitors or players they're likely watching",
      "Companies they probably benchmark against"
    ]
  },
  
  "howToApproach": [
    "Specific tactics for communicating with this person",
    "What to lead with in conversations",
    "How to build rapport based on their interests"
  ],
  
  "whatToAvoid": [
    "Communication mistakes to avoid",
    "Topics or approaches that would turn them off",
    "Red flags that would damage the relationship"
  ],
  
  "predictedMindset": "What they're most likely thinking about RIGHT NOW based on their role, recent posts, and current business context. Be specific.",
  
  "talkingPoints": [
    "5 specific topics that would resonate with them based on their content",
    "Things you could mention to show you understand their world"
  ],
  
  "questionsToAsk": [
    "5 thoughtful questions that would engage them",
    "Questions based on their interests and recent activity"
  ],
  
  "icebreakers": [
    "3 conversation starters based on their recent social media activity",
    "References to their content that would impress them"
  ],
  
  "conversationScripts": {
    "openers": [
      "Complete sentence to open a conversation naturally",
      "Another opening line referencing their work or industry",
      "A third opener that shows you've done your homework"
    ],
    "industryInsightLines": [
      "A sentence referencing a trend in their industry that invites discussion",
      "A line about a challenge in their sector that shows empathy",
      "A comment about an opportunity that would interest them"
    ],
    "valueStatements": [
      "A sentence showing how you could help with their likely challenges",
      "A line that positions you as understanding their world"
    ],
    "followUpLines": [
      "A good line to use when following up after a meeting",
      "A way to re-engage if conversation has gone cold"
    ],
    "closingLines": [
      "A strong way to end a conversation and set up next steps",
      "A memorable closing that leaves a good impression"
    ]
  }
}

Be specific and actionable. Use details from their actual social media presence. Think like a world-class executive coach preparing someone for a crucial meeting.

RESPOND ONLY WITH THE JSON - NO OTHER TEXT.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2500,
    });

    let responseText = completion.choices[0].message.content || "{}";
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const analysis = JSON.parse(responseText);
    return analysis;
    
  } catch (err) {
    console.error("AI analysis error:", err);
    
    // Return default structure
    return {
      background: "Unable to analyze - limited information available.",
      professionalFocus: ["Unknown - research more about this contact"],
      communicationStyle: "Start with a professional, respectful approach until you learn more.",
      likelyConcerns: ["Unknown - ask open-ended questions to discover"],
      motivations: ["Unknown - learn through conversation"],
      decisionMakingStyle: "Unknown - observe in your interactions",
      onlinePresence: "Limited online presence found.",
      contentThemes: ["Unknown - explore through conversation"],
      howToApproach: ["Be professional and curious", "Ask about their role and challenges", "Listen actively"],
      whatToAvoid: ["Making assumptions", "Being too pushy", "Talking more than listening"],
      predictedMindset: "Unknown - this is a new relationship to explore.",
      talkingPoints: ["Their role and responsibilities", "Current projects", "Industry trends"],
      questionsToAsk: ["What's your biggest focus right now?", "What challenges are you facing?", "How can I be helpful?"],
      icebreakers: ["I'd love to learn more about your work at " + (company || "your company")],
    };
  }
}

// ============================================
// Get Contact from Notion
// ============================================

async function getContactFromNotion(contactId: string): Promise<{
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
} | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: contactId }) as any;
    const props = page.properties || {};
    
    return {
      name: props.Name?.title?.[0]?.plain_text || "Unknown",
      email: props.Email?.email || null,
      company: props.Company?.rich_text?.[0]?.plain_text || 
               props.Company?.select?.name || null,
      role: props.Role?.rich_text?.[0]?.plain_text || 
            props.Title?.rich_text?.[0]?.plain_text || null,
      notes: props.Notes?.rich_text?.[0]?.plain_text || null,
    };
  } catch (err) {
    console.error("Error fetching contact from Notion:", err);
    return null;
  }
}

// ============================================
// Search Contacts in Notion
// ============================================

async function searchContactsInNotion(query: string): Promise<Array<{
  id: string;
  name: string;
  email: string | null;
  company: string | null;
}>> {
  if (!SECOND_BRAIN_DB) return [];
  
  try {
    const response = await notion.databases.query({
      database_id: SECOND_BRAIN_DB.replace(/-/g, ""),
      filter: {
        or: [
          { property: "Name", title: { contains: query } },
          { property: "Email", email: { contains: query } },
        ],
      },
      page_size: 20,
    });
    
    return response.results.map((page: any) => {
      const props = page.properties || {};
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.plain_text || "Unknown",
        email: props.Email?.email || null,
        company: props.Company?.rich_text?.[0]?.plain_text || 
                 props.Company?.select?.name || null,
      };
    });
  } catch (err) {
    console.error("Error searching contacts:", err);
    return [];
  }
}

// ============================================
// API Handlers
// ============================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const query = searchParams.get("query");
  const contactId = searchParams.get("contactId");
  
  // Search contacts
  if (action === "search" && query) {
    const contacts = await searchContactsInNotion(query);
    return NextResponse.json({ ok: true, contacts });
  }
  
  // Get contact details
  if (action === "get" && contactId) {
    const contact = await getContactFromNotion(contactId);
    if (!contact) {
      return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, contact });
  }
  
  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const usageCheck = await canMakeAICall(userId, "intelligence", 5);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const body = await req.json();
    const { action, name, company, role, email, contactId, existingContext } = body;
    
    // Research a contact
    if (action === "research") {
      if (!name) {
        return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
      }
      
      console.log(`🔮 Starting multi-platform intelligence scan for: ${name}`);
      
      const { webResults, categorizedResults, analysis, confidence } = await researchContact(
        name,
        company || null,
        role || null,
        email || null,
        existingContext || null
      );
      
      const profile = {
        name,
        email: email || null,
        company: company || null,
        role: role || null,
        webResults,
        categorizedResults,
        analysis,
        researchedAt: new Date().toISOString(),
        confidence,
      };
      
      console.log(`✅ Multi-platform intelligence complete for: ${name}`);
      
      return NextResponse.json({ ok: true, profile });
    }
    
    // Quick research from contact ID
    if (action === "research-contact" && contactId) {
      const contact = await getContactFromNotion(contactId);
      if (!contact) {
        return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
      }
      
      console.log(`🔮 Starting multi-platform intelligence scan for: ${contact.name}`);
      
      const { webResults, categorizedResults, analysis, confidence } = await researchContact(
        contact.name,
        contact.company,
        contact.role,
        contact.email,
        contact.notes
      );
      
      const profile = {
        ...contact,
        webResults,
        categorizedResults,
        analysis,
        researchedAt: new Date().toISOString(),
        confidence,
      };
      
      console.log(`✅ Multi-platform intelligence complete for: ${contact.name}`);
      
      return NextResponse.json({ ok: true, profile });
    }
    
    // Save Intel to Contact
    if (action === "save-intel" && contactId) {
      const { analysis } = body;
      
      if (!analysis) {
        return NextResponse.json({ ok: false, error: "No analysis to save" }, { status: 400 });
      }
      
      console.log(`💾 Saving intel to contact: ${contactId}`);
      
      try {
        // Build compact summary for Raw Data (under 2000 chars)
        const compactSummary = `
🔮 INTEL GATHERED: ${new Date().toLocaleDateString()}

📋 BACKGROUND:
${analysis.background || "N/A"}

🎯 FOCUS: ${(analysis.professionalFocus || []).slice(0, 3).join(", ")}

💬 STYLE: ${analysis.communicationStyle || "N/A"}

😰 CONCERNS: ${(analysis.likelyConcerns || []).slice(0, 3).join("; ")}

🚀 MOTIVATIONS: ${(analysis.motivations || []).slice(0, 3).join("; ")}

🧭 DECISIONS: ${analysis.decisionMakingStyle || "N/A"}

🔮 MINDSET: ${analysis.predictedMindset || "N/A"}

✅ APPROACH: ${(analysis.howToApproach || []).slice(0, 3).join("; ")}

⛔ AVOID: ${(analysis.whatToAvoid || []).slice(0, 2).join("; ")}

💡 TALKING POINTS: ${(analysis.talkingPoints || []).slice(0, 3).join("; ")}
`.trim().substring(0, 1900);

        // Build key insights
        const keyInsights = [
          analysis.predictedMindset,
          ...(analysis.likelyConcerns || []).slice(0, 2),
          ...(analysis.motivations || []).slice(0, 2),
        ].filter(Boolean).join(" | ").substring(0, 500);

        // Update the Notion contact
        await notion.pages.update({
          page_id: contactId,
          properties: {
            "Raw Data": {
              rich_text: [{ text: { content: compactSummary } }],
            },
            "Key Insights": {
              rich_text: [{ text: { content: keyInsights } }],
            },
            "Communication Style": {
              rich_text: [{ text: { content: (analysis.communicationStyle || "").substring(0, 200) } }],
            },
            "Pain Points": {
              rich_text: [{ text: { content: (analysis.likelyConcerns || []).join("; ").substring(0, 500) } }],
            },
            "Goals": {
              rich_text: [{ text: { content: (analysis.motivations || []).join("; ").substring(0, 500) } }],
            },
            "Decision Making Pattern": {
              rich_text: [{ text: { content: (analysis.decisionMakingStyle || "").substring(0, 200) } }],
            },
            "Last Intelligence Gather": {
              date: { start: new Date().toISOString() },
            },
          },
        });

        console.log(`✅ Intel saved to contact: ${contactId}`);
        
        return NextResponse.json({ ok: true, message: "Intel saved to contact" });
        
      } catch (err: any) {
        console.error("Error saving intel:", err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
      }
    }
    
    // Pre-call briefing
    if (action === "briefing") {
      if (!name) {
        return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
      }
      
      console.log(`📞 Generating pre-call briefing for: ${name}`);
      
      // First do research
      const { analysis, confidence } = await researchContact(
        name,
        company || null,
        role || null,
        email || null,
        existingContext || null
      );
      
      // Generate briefing
      const briefingPrompt = `You are preparing someone for an important call/meeting.

PERSON THEY'RE MEETING:
- Name: ${name}
- Company: ${company || "Unknown"}
- Role: ${role || "Unknown"}

INTELLIGENCE GATHERED:
${JSON.stringify(analysis, null, 2)}

Create a concise, actionable PRE-CALL BRIEFING. Format it for quick reading before the call.

Include:
1. 🎯 OBJECTIVE - What to aim for in this conversation
2. 🧠 MINDSET - What they're likely thinking/feeling
3. 💬 OPENING - How to start the conversation
4. ✅ KEY POINTS - 3-5 things to cover
5. ❓ QUESTIONS - 3 powerful questions to ask
6. ⚠️ WATCH OUT - What to avoid
7. 🎁 VALUE - How to provide value to them

Be specific. No fluff. Make it actionable.`;

      const briefingCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: briefingPrompt }],
        temperature: 0.7,
        max_tokens: 1500,
      });
      
      const briefing = briefingCompletion.choices[0].message.content || "";
      
      return NextResponse.json({ 
        ok: true, 
        briefing,
        profile: {
          name,
          company,
          role,
          analysis,
          confidence,
        }
      });
    }
    
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    
  } catch (err: any) {
    console.error("❌ Intelligence error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
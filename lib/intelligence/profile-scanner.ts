
import { ContactProfile } from "@/types/crm";
import Exa from "exa-js";

const EXA_API_KEY = process.env.EXA_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

export interface EnrichmentResult {
    success: boolean;
    profile?: Partial<ContactProfile>;
    error?: string;
    logs: string[];
}

export async function enrichContactProfile(
    name: string,
    company: string,
    location?: string
): Promise<EnrichmentResult> {
    const logs: string[] = [];
    logs.push(`🔍 Starting investigation for: ${name} @ ${company}`);

    try {
        // 1. Discovery Phase (Exa)
        let linkedInUrl = null;
        let contextUrls: string[] = [];

        if (!EXA_API_KEY) {
            logs.push("⚠️ EXA_API_KEY missing. Skipping neural search.");
        } else {
            logs.push("🕵️‍♀️ Exa: Searching for accurate social footprint...");
            const exa = new Exa(EXA_API_KEY);

            try {
                const searchResult = await exa.searchAndContents(
                    `${name} ${company} linkedin twitter personal site`,
                    {
                        type: "neural",
                        useAutoprompt: true,
                        numResults: 3,
                        category: "personal site"
                    }
                );

                contextUrls = searchResult.results.map((r: any) => r.url);
                linkedInUrl = contextUrls.find(u => u.includes("linkedin.com/in")) || null;

                if (linkedInUrl) logs.push(`✅ Found LinkedIn: ${linkedInUrl}`);
                logs.push(`📚 Found ${contextUrls.length} relevant sources.`);
            } catch (e: any) {
                logs.push(`⚠️ Exa Search Error: ${e.message}`);
            }
        }

        // 2. Analysis Phase (Perplexity)
        logs.push(`🧠 Synthesizing psychological profile via Perplexity...`);

        if (!PERPLEXITY_API_KEY) {
            logs.push("⚠️ PERPLEXITY_API_KEY missing. Using fallback simulation data.");
            // Fallback simulation logic for demo
            return {
                success: true,
                logs,
                profile: {
                    linkedin_url: linkedInUrl || undefined,
                    pulse_bio: `(Simulation) ${name} is a key leader at ${company}. Activate your API keys to get real psychological insights.`,
                    gift_ideas: ["Simulation: Tech Gadget", "Simulation: Business Book", "Simulation: Premium Coffee"],
                    communication_style: "Simulation: Direct and professional.",
                    ice_breakers: ["Ask about their recent project", "Discuss industry trends"]
                }
            };
        }

        const analysis = await analyzePerson(name, company, contextUrls);

        logs.push(`✨ Profile generated successfully.`);

        return {
            success: true,
            profile: {
                linkedin_url: linkedInUrl || undefined,
                ...analysis
            },
            logs
        };

    } catch (error: any) {
        logs.push(`❌ Critical Error: ${error.message}`);
        return { success: false, logs, error: error.message };
    }
}

async function analyzePerson(name: string, company: string, urls: string[]): Promise<any> {
    const prompt = `
    Analyze ${name} from ${company}.
    Context URLs: ${urls.join(", ")}
    
    Your goal is to be a hyper-intelligent assistant. 
    Analyze their public footprint to generate a "Cheat Sheet" for me to build a relationship.

    Return a PURE JSON object (no markdown) with these keys:
    - pulse_bio (2 sentences summary of their career and vibe)
    - gift_ideas (3 specific, creative gift items based on their potential interests. Make them "God Tier" gifts)
    - communication_style (how to talk to them: e.g. "Direct", "Casual", "Data-driven")
    - ice_breakers (2 conversation starters based on their recent probable activity)
  `;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "sonar-pro",
            messages: [
                { role: "system", content: "You are an expert profiler for high-stakes networking." },
                { role: "user", content: prompt }
            ]
        })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Clean markdown code blocks if present
    const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(cleanJson);
}

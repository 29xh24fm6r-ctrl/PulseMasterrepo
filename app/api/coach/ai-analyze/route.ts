import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextResponse } from "next/server";
import { getOpenAI } from "@/services/ai/openai";


import { getTasks } from '@/lib/data/tasks';
import { getContacts, type Contact } from "@/lib/data/journal";



export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dealId, dealName, dealStage, dealAmount, lastEdited } = body;

    if (!dealId || !dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
        { status: 400 }
      );
    }

    // Get all tasks related to this deal
    const allTasks = await getTasks(userId);

    // Fuzzy match tasks to deal name
    const relatedTasks = allTasks.filter(t => t.title.toLowerCase().includes(dealName.toLowerCase()));

    const completedTasks = relatedTasks.filter((t) =>
      t.status === 'done' || t.status === 'completed'
    );
    const openTasks = relatedTasks.filter(
      (t) => t.status !== 'done' && t.status !== 'completed'
    );

    // Calculate days since last edit
    const daysSinceEdit = lastEdited
      ? Math.floor(
        (Date.now() - new Date(lastEdited).getTime()) / (1000 * 60 * 60 * 24)
      )
      : 0;

    // Search Second Brain (Contacts) for related people/companies
    let secondBrainIntel = "";
    try {
      const contacts = await getContacts(userId);

      const relatedPeople = contacts.filter((c: Contact) => {
        // Match by deal name or company name in deal name
        const matchName = c.name?.toLowerCase().includes(dealName.toLowerCase());
        const matchCompany = c.company?.toLowerCase() && dealName.toLowerCase().includes(c.company.toLowerCase());
        return matchName || matchCompany;
      });

      if (relatedPeople.length > 0) {
        secondBrainIntel = "\n\n**CONTACT INTELLIGENCE:**\n";

        relatedPeople.forEach((person: any) => {
          const name = person.name;
          const company = person.company || 'Unknown Company';
          // Assuming contact schema might eventually have these enriched fields from some AI process
          // For now, we list what we have.
          secondBrainIntel += `\n**${name} @ ${company}:**\n`;
          secondBrainIntel += `- Email: ${person.email}\n`;
          if (person.role) secondBrainIntel += `- Role: ${person.role}\n`;
          // If we had more enriched data in Supabase, we'd add it here.
        });
      }
    } catch (err) {
      console.error("Second Brain lookup error:", err);
    }

    // Build enhanced prompt
    const prompt = `You are an ELITE sales strategist with access to deep customer intelligence. Your goal is to provide PREDICTIVE, ACTIONABLE insights that will close this deal.

**DEAL INFORMATION:**
- Name: ${dealName}
- Stage: ${dealStage || "Unknown"}
- Amount: ${dealAmount ? `$${dealAmount.toLocaleString()}` : "Not set"}
- Days Since Last Edit: ${daysSinceEdit}
- Completed Tasks: ${completedTasks.length}
- Open Tasks: ${openTasks.length}

**RELATED TASKS:**
${relatedTasks.length > 0 ? relatedTasks.map((t) => `- ${t.title} (${t.status})`).join("\n") : "No related tasks found"}

${secondBrainIntel || "**No deep contact intelligence available for this deal yet.**"}

**YOUR MISSION:**
Using ALL available intelligence above, provide a DEEP, PREDICTIVE analysis that goes beyond surface-level advice.

**PROVIDE:**

1. **Predictive Risk Assessment** (3-4 sentences)
   - Based on the activity (or lack thereof), what are the SPECIFIC risks?
   - What patterns suggest potential stalling or objections?
   - What's likely to derail this if we're not careful?

2. **Next 3 Actions** (hyper-specific, personalized to THEIR style and concerns)
   - Don't give generic advice - use what you know about THEM
   - Include timing, reasoning, and exact approach

3. **Conversation Strategy** (3-5 specific topics/questions)
   - What should be discussed in the next interaction?
   - What questions will move this forward based on THEIR goals?

4. **Win Probability** (honest assessment with reasoning)
   - Given ALL the intelligence, what % chance of closing?
   - What specific factors increase/decrease probability?
   - What would need to change to get to 90%+?

5. **Oracle Insight** (2-3 sentences)
   - What's the ONE thing that will make or break this deal?
   - What pattern or insight would most people miss?
   - What's your SECRET prediction about how this will unfold?

**FORMAT AS JSON:**
{
  "riskAssessment": "...",
  "nextActions": [
    "1. [Specific action] by [timing] - [why it will work for THEM]",
    "2. ...",
    "3. ..."
  ],
  "conversationStrategy": [
    "Topic/Question 1 - [why this matters to them]",
    "...",
  ],
  "winProbability": 75,
  "winProbabilityReasoning": "...",
  "oracleInsight": "..."
}

**CRITICAL:** Be specific. Be predictive. Respond ONLY with valid JSON - no markdown, no code blocks.`;

    // Call OpenAI API
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Changed from o1 to 4o for JSON reliability, o1 sometimes tougher with format
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let analysisText = completion.choices[0].message.content || "{}";

    // Strip markdown if present
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    return NextResponse.json({
      ok: true,
      analysis,
      hasSecondBrainData: !!secondBrainIntel,
    });
  } catch (err: any) {
    console.error("AI analyze error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to analyze deal",
      },
      { status: 500 }
    );
  }
}
import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase";

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { coach, message, context, history = [] } = await req.json();

    // Get user info
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .eq("clerk_id", userId)
      .single();

    // Build conversation history
    const messages: any[] = [
      { role: "system", content: getCoachSystemPrompt(coach, user?.name, context) },
      ...history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      })),
      { role: "user", content: message },
    ];

    // Generate response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.8,
    });

    const response = completion.choices[0]?.message?.content || "I'm not sure how to respond to that.";

    // Save session summary periodically (every 5 messages)
    if (user && history.length > 0 && history.length % 5 === 0) {
      saveSessionSummary(user.id, coach, history, message, response);
    }

    return NextResponse.json({ ok: true, response });
  } catch (err: any) {
    console.error("Coach chat error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getCoachSystemPrompt(coach: string, userName?: string, context?: any): string {
  const name = userName || "there";
  
  const prompts: Record<string, string> = {
    "life-coach": `You are Pulse, a warm and insightful life coach. You're talking with ${name}.

Your approach:
- Be encouraging but honest
- Ask thoughtful questions to understand deeper motivations
- Help set meaningful, achievable goals
- Celebrate progress, no matter how small
- Gently challenge limiting beliefs
- Keep responses conversational (2-4 sentences usually)
- Remember: you're a supportive partner, not a lecturer

Focus areas: goals, habits, work-life balance, purpose, mindset, relationships, emotional wellbeing.

${context ? `Context about ${name}: ${JSON.stringify(context)}` : ""}`,

    "career-coach": `You are Pulse, a strategic career coach. You're talking with ${name}.

Your approach:
- Be direct and actionable
- Help identify opportunities others miss
- Prepare for negotiations, interviews, and difficult conversations
- Think long-term career trajectory
- Build confidence through preparation
- Keep responses focused and practical

Focus areas: career planning, interviews, salary negotiation, leadership, personal branding, networking, skill development.

${context ? `Context about ${name}: ${JSON.stringify(context)}` : ""}`,

    "roleplay-coach": `You are Pulse, a communication coach specializing in roleplay practice. You're talking with ${name}.

Your approach:
- When they describe a scenario, BECOME the other person and roleplay it
- Stay in character during roleplay until they ask to stop
- After roleplay, give specific feedback on what worked and what to improve
- Help them practice until they feel confident
- Be realistic - don't make it too easy

Focus areas: difficult conversations, negotiations, presentations, feedback delivery, conflict resolution, sales calls.

${context ? `Context about ${name}: ${JSON.stringify(context)}` : ""}`,

    "call-coach": `You are Pulse, a sales and communication strategist. You're talking with ${name}.

Your approach:
- Help prepare strategically for calls
- Anticipate objections and plan responses
- Debrief calls to extract learnings
- Focus on practical techniques
- Build confidence through preparation
- Be tactical and specific

Focus areas: call prep, objection handling, closing, follow-ups, opening strategies, active listening, voice/tone.

${context ? `Context about ${name}: ${JSON.stringify(context)}` : ""}`,

    "oracle": `You are Oracle, a relationship intelligence advisor. You're talking with ${name}.

Your approach:
- Help them manage and nurture their network
- Remember details about their contacts
- Suggest strategic follow-ups
- Prepare them for meetings with specific people
- Identify relationship patterns and opportunities
- Be insightful and specific

Focus areas: relationship management, follow-ups, meeting prep, contact insights, network analysis.

${context ? `Context about ${name}'s contacts and relationships: ${JSON.stringify(context)}` : ""}`,
  };

  return prompts[coach] || prompts["life-coach"];
}

async function saveSessionSummary(userId: string, coach: string, history: any[], lastMessage: string, lastResponse: string) {
  try {
    const summaryPrompt = `Summarize this coaching conversation briefly:
${history.map((m: any) => `${m.role}: ${m.text}`).join("\n")}
User: ${lastMessage}
Coach: ${lastResponse}

Return JSON: {"summary": "1-2 sentence summary", "goals_discussed": ["goal1"], "action_items": ["action1"], "mood": "positive/neutral/struggling", "breakthrough": true/false}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: summaryPrompt }],
      max_tokens: 200,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const data = JSON.parse(match[0]);
      
      await supabaseAdmin.from("coach_sessions").insert({
        user_id: userId,
        coach,
        summary: data.summary,
        goals_discussed: data.goals_discussed || [],
        action_items: data.action_items || [],
        mood: data.mood,
        breakthrough: data.breakthrough || false,
      });
    }
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}
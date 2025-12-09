import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildCoachingContext } from "@/lib/career/job-model";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * POST - Chat with career coach
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const usageCheck = await canMakeAICall(userId, "career_chat", 5);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const body = await request.json();
    const { message, history, jobModel } = body;
    
    if (!message || !jobModel) {
      return NextResponse.json(
        { ok: false, error: 'Message and jobModel required' },
        { status: 400 }
      );
    }
    
    const coachingContext = buildCoachingContext(jobModel);
    
    const systemPrompt = `You are an expert Career Coach specialized in helping professionals excel in their careers.

${coachingContext}

## YOUR ROLE
You are this person's dedicated career coach. You understand their specific job, industry, and daily challenges.

## COACHING STYLE
- Be supportive but direct — don't sugarcoat, but be kind
- Give actionable, specific advice tailored to their role
- Reference their actual success metrics and skills
- Use real examples from their industry
- Keep responses concise (2-4 paragraphs max)
- Ask clarifying questions when needed
- Celebrate wins and progress

## WHAT YOU CAN HELP WITH
- Day-to-day work challenges
- Difficult conversations (boss, peers, clients)
- Career advancement strategies
- Skill development priorities
- Work-life balance
- Navigating office politics
- Performance reviews
- Job transitions
- Building professional reputation

Remember: You know their job intimately. Give advice that a real mentor in their field would give.`;

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];
    
    // Add history
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) { // Last 10 messages
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
    
    // Add current message
    messages.push({ role: "user", content: message });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.8,
      max_tokens: 600,
    });
    
    const response = completion.choices[0]?.message?.content || "I'm not sure how to respond to that.";
    
    return NextResponse.json({
      ok: true,
      response,
      usage: completion.usage,
    });
    
  } catch (error: any) {
    console.error('Career chat error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

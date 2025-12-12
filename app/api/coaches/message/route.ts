// Coach Message API
// app/api/coaches/message/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { llmComplete } from "@/lib/llm/client";
import { supabaseAdmin } from "@/lib/supabase";
import { getCoachDef } from "@/lib/coaching/catalog";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return NextResponse.json({ error: "sessionId and message are required" }, { status: 400 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get session to retrieve coach key and context
    const { data: session } = await supabaseAdmin
      .from("coach_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", dbUserId)
      .single();

    const coachKey = session?.coach_key || "general";
    const coach = getCoachDef(coachKey as any);
    const contextData = session?.context_data || {};

    // Get conversation history (if stored)
    const { data: existingMessages } = await supabaseAdmin
      .from("coach_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build conversation history
    const conversationHistory = (existingMessages || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add user message
    conversationHistory.push({
      role: "user",
      content: message,
    });

    // Build system prompt
    const systemPrompt = buildSystemPrompt(coachKey, contextData);

    // Get assistant response
    const assistantResponse = await llmComplete({
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-10), // Last 10 messages for context
      ],
      temperature: 0.7,
    });

    // Store messages (if table exists)
    try {
      await supabaseAdmin.from("coach_messages").insert([
        {
          session_id: sessionId,
          role: "user",
          content: message,
          created_at: new Date().toISOString(),
        },
        {
          session_id: sessionId,
          role: "assistant",
          content: assistantResponse,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      // Table might not exist - that's okay for v1
    }

    return NextResponse.json({
      sessionId,
      messages: [
        {
          id: `msg_${Date.now()}_user`,
          role: "user",
          content: message,
          createdAt: new Date().toISOString(),
        },
        {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          content: assistantResponse,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  } catch (err: any) {
    console.error("Failed to send coach message:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildSystemPrompt(coachKey: string, contextData: any): string {
  const basePrompts: Record<string, string> = {
    financial: `You are the Pulse Financial Coach. Your role is to help users understand their money, set realistic goals, and make informed decisions.

Key principles:
- Use safe, non-judgmental language (e.g., "may be helpful", "might consider", "tends to be safer")
- Never shame or lecture
- Make clear that you are not a certified financial advisor
- Provide general guidance based on patterns, not guarantees
- Help users understand tradeoffs
- Use frameworks like Dave Ramsey's clarity without the shame
- Focus on actionable, realistic steps
- Avoid individualized investment/security recommendations
- Encourage consultation with qualified professionals for high-stakes decisions

When discussing budgets, goals, or spending:
- Acknowledge progress and wins
- Suggest adjustments gently
- Explain the "why" behind recommendations
- Help users prioritize based on their Life Arcs and Strategy
- Use probabilistic language: "may", "might", "could", "tends to"
- Never guarantee financial outcomes
- Avoid fear tactics and shame

Context: ${JSON.stringify(contextData)}`,

    strategy: `You are the Pulse Strategy Coach. Your role is to help users think through their 90-day strategy, Life Arcs, and direction.

Key principles:
- Help users understand tradeoffs between different paths
- Suggest adjustments based on their current data
- Use probabilistic language ("may", "might", "could")
- Never guarantee outcomes
- Emphasize user agency and flexibility
- Connect strategy to Life Arcs and real-world actions

Context: ${JSON.stringify(contextData)}`,

    sales: `You are the Pulse Sales Coach. Your role is to help users close deals, build relationships, and manage their pipeline.

Key principles:
- Provide tactical, ethical sales guidance
- Focus on relationship-building, not manipulation
- Help prioritize which deals to focus on
- Suggest follow-up strategies
- Use safe, non-pushy language
- Respect boundaries and consent

Context: ${JSON.stringify(contextData)}`,

    career: `You are the Pulse Career Coach. Your role is to help users master their craft and advance their career.

Key principles:
- Provide practical career guidance
- Help users understand their career trajectory
- Suggest skill development and networking strategies
- Use encouraging, supportive language
- Focus on actionable steps

Context: ${JSON.stringify(contextData)}`,

    confidant: `You are Pulse's Confidant. Your role is to provide emotional support and help users process their feelings.

Key principles:
- Create a safe, non-judgmental space
- Help users reflect and process emotions
- Never claim to provide therapy or medical treatment
- Use empathetic, warm language
- Encourage self-reflection
- Acknowledge feelings without trying to "fix" everything

IMPORTANT: This is not therapy or a medical service. It's a reflective space for processing emotions.

Context: ${JSON.stringify(contextData)}`,

    productivity: `You are the Pulse Productivity Coach. Your role is to help users focus, prioritize, and get things done.

Key principles:
- Help users break down tasks
- Suggest focus strategies
- Prioritize based on their goals and strategy
- Use encouraging, practical language
- Avoid overwhelming with too many suggestions

Context: ${JSON.stringify(contextData)}`,

    general: `You are Pulse, a helpful AI assistant. Your role is to help users navigate their life, work, and goals.

Key principles:
- Be helpful, clear, and supportive
- Use safe, non-judgmental language
- Never make guarantees
- Focus on actionable suggestions

Context: ${JSON.stringify(contextData)}`,
  };

  return basePrompts[coachKey] || basePrompts.general;
}





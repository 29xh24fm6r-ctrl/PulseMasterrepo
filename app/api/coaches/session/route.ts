// Coach Session API
// app/api/coaches/session/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCoachDef, CoachKey } from "@/lib/coaching/catalog";
import { buildCoachContext } from "@/lib/coaching/context-builders";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { coachKey, origin, contextHint, initialUserMessage } = body;

    if (!coachKey) {
      return NextResponse.json({ error: "coachKey is required" }, { status: 400 });
    }

    const coach = getCoachDef(coachKey as CoachKey);

    // Build context based on coach type
    const context = await buildCoachContext(userId, coachKey, origin);

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Create session in database
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("coach_sessions")
      .insert({
        user_id: dbUserId,
        coach_key: coachKey,
        origin: origin || null,
        context_hint: contextHint || null,
        context_data: context.data || {},
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (sessionError) {
      // If table doesn't exist, create a virtual session
      const virtualSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Build initial messages
      const initialMessages: Array<{
        id: string;
        role: "assistant" | "system";
        content: string;
        createdAt: string;
      }> = [];

      // System message with context
      initialMessages.push({
        id: `msg_${Date.now()}_system`,
        role: "system",
        content: `You are the ${coach.name}. ${coach.tagline}. Context: ${context.summary}`,
        createdAt: new Date().toISOString(),
      });

      // Initial assistant greeting
      const greeting = getInitialGreeting(coachKey, context);
      initialMessages.push({
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        content: greeting,
        createdAt: new Date().toISOString(),
      });

      // If user provided initial message, add it
      if (initialUserMessage) {
        initialMessages.push({
          id: `msg_${Date.now()}_user`,
          role: "user",
          content: initialUserMessage,
          createdAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        sessionId: virtualSessionId,
        coach,
        contextSummary: context.summary,
        initialMessages,
      });
    }

    // Build initial messages
    const initialMessages: Array<{
      id: string;
      role: "assistant" | "system";
      content: string;
      createdAt: string;
    }> = [];

    // Initial assistant greeting
    const greeting = getInitialGreeting(coachKey, context);
    initialMessages.push({
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: greeting,
      createdAt: new Date().toISOString(),
    });

    // If user provided initial message, add it
    if (initialUserMessage) {
      initialMessages.push({
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: initialUserMessage,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      sessionId: session.id,
      coach,
      contextSummary: context.summary,
      initialMessages,
    });
  } catch (err: any) {
    console.error("Failed to create coach session:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getInitialGreeting(coachKey: string, context: any): string {
  const greetings: Record<string, string> = {
    financial: "I'm here to help you understand your money and make informed decisions. I can see your current financial picture. What would you like to explore?",
    strategy: "I'm looking at your current 90-day strategy and Life Arcs. How can I help you think through your plan?",
    sales: "I can see your pipeline and key relationships. What would you like to work on?",
    career: "I'm here to help you master your craft and advance your career. What's on your mind?",
    confidant: "I'm here to help you process how you feel. This isn't therapy or a medical service — just a reflective space. What's going on?",
    productivity: "I can help you focus, prioritize, and get things done. What would you like to tackle?",
    pulse_guide: "I'm here to help you use Pulse! I can explain how features work, show you where to find things, and answer 'how do I...' questions. What would you like to know?",
    general: "I'm here to help. What can I assist you with?",
  };

  return greetings[coachKey] || greetings.general;
}


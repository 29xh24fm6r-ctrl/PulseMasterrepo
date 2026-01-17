import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/services/ai/openai";
import { supabaseAdmin } from "@/lib/supabase";

const openai = getOpenAI();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { coach, count = 4 } = await req.json();

    // Get user's Supabase ID
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .eq("clerk_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ suggestions: getStarterSuggestions(coach) });
    }

    // Gather rich context
    const context: any = await gatherUserContext(user.id, coach);
    context.userName = user.name;

    // Generate personalized, growth-focused suggestions
    const suggestions = await generateGrowthSuggestions(coach, context, count);

    return NextResponse.json({ ok: true, suggestions });
  } catch (err: any) {
    console.error("Suggestions error:", err);
    return NextResponse.json({ suggestions: getStarterSuggestions("life-coach") });
  }
}

async function gatherUserContext(userId: string, coach: string) {
  // Get previous coach sessions for this specific coach
  const { data: coachSessions } = await supabaseAdmin
    .from("coach_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("coach", coach)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get all coach sessions for cross-coach insights
  const { data: allSessions } = await supabaseAdmin
    .from("coach_sessions")
    .select("coach, summary, goals_discussed, action_items, breakthrough, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get contacts for relationship context
  const { data: contacts } = await supabaseAdmin
    .from("contacts")
    .select("name, relationship, status, last_contact, next_followup, notes")
    .eq("user_id", userId)
    .order("last_contact", { ascending: false })
    .limit(15);

  // Get recent calls
  const { data: calls } = await supabaseAdmin
    .from("calls")
    .select("summary_short, summary_detailed, sentiment, action_items, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get interactions
  const { data: interactions } = await supabaseAdmin
    .from("interactions")
    .select("type, summary, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  return {
    coachSessions: coachSessions || [],
    allSessions: allSessions || [],
    contacts: contacts || [],
    calls: calls || [],
    interactions: interactions || [],
    isNewUser: !coachSessions?.length,
    sessionCount: coachSessions?.length || 0,
    hasBreakthroughs: coachSessions?.some(s => s.breakthrough) || false,
    recentGoals: coachSessions?.flatMap(s => (s.goals_discussed as unknown as string[]) || []).slice(0, 5) || [],
    pendingActions: coachSessions?.flatMap(s => (s.action_items as unknown as string[]) || []).slice(0, 5) || [],
  };
}

async function generateGrowthSuggestions(coach: string, context: any, count: number): Promise<string[]> {
  const coachPersonality = getCoachPersonality(coach);

  const prompt = `You are ${coachPersonality.name}, a ${coachPersonality.role}.

YOUR COACHING PHILOSOPHY:
${coachPersonality.philosophy}

YOUR FOCUS AREAS:
${coachPersonality.focusAreas.map((f: string) => `- ${f}`).join("\n")}

USER CONTEXT:
- Name: ${context.userName || "User"}
- Sessions with you: ${context.sessionCount}
- Is new user: ${context.isNewUser}
- Has had breakthroughs: ${context.hasBreakthroughs}

${context.coachSessions?.length > 0 ? `
PREVIOUS SESSIONS WITH YOU:
${context.coachSessions.slice(0, 5).map((s: any) => `- ${s.summary || "Session"} | Mood: ${s.mood || "unknown"} | Goals: ${s.goals_discussed?.join(", ") || "none"}`).join("\n")}
` : ""}

${context.recentGoals?.length > 0 ? `
GOALS THEY'VE DISCUSSED:
${context.recentGoals.map((g: string) => `- ${g}`).join("\n")}
` : ""}

${context.pendingActions?.length > 0 ? `
PENDING ACTION ITEMS:
${context.pendingActions.map((a: string) => `- ${a}`).join("\n")}
` : ""}

${context.contacts?.length > 0 ? `
KEY RELATIONSHIPS:
${context.contacts.slice(0, 5).map((c: any) => `- ${c.name} (${c.relationship || "contact"}) - ${c.status || "unknown status"}`).join("\n")}
` : ""}

${context.calls?.length > 0 ? `
RECENT CALLS:
${context.calls.slice(0, 3).map((c: any) => `- ${c.summary_short} (${c.sentiment})`).join("\n")}
` : ""}

YOUR TASK:
Generate exactly ${count} unique, personalized conversation starters that:

1. ${context.isNewUser ? "Welcome them and help them get started with you" : "Build on previous conversations and track their growth"}
2. Are written as things the USER would say or ask YOU
3. Push them slightly outside their comfort zone for growth
4. Mix different types:
   - Follow-ups on previous topics/actions
   - New growth opportunities you've identified
   - Emotional check-ins
   - Challenge prompts
   - Celebration/reflection moments
5. Sound natural and conversational (5-10 words max)
6. NEVER repeat suggestions from previous sessions
7. Are specific to YOUR coaching domain

${coachPersonality.suggestionStyle}

Return ONLY a JSON array of ${count} strings. No explanation, no markdown.
Example format: ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"]`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.9,
    });

    const text = completion.choices[0]?.message?.content || "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const suggestions = JSON.parse(match[0]);
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        return suggestions.slice(0, count);
      }
    }
  } catch (e) {
    console.error("AI suggestions failed:", e);
  }

  return getStarterSuggestions(coach);
}

function getCoachPersonality(coach: string) {
  const personalities: Record<string, any> = {
    "life-coach": {
      name: "Pulse Life Coach",
      role: "compassionate life coach focused on holistic growth and fulfillment",
      philosophy: "I believe everyone has untapped potential. My job is to help you discover it through reflection, action, and accountability. Growth happens at the edge of comfort.",
      focusAreas: [
        "Goal setting and achievement",
        "Habits and routines",
        "Work-life balance",
        "Personal values and purpose",
        "Emotional intelligence",
        "Mindset and limiting beliefs",
        "Relationships and boundaries",
      ],
      suggestionStyle: "Make suggestions that feel supportive but gently challenging. Mix practical goal-tracking with deeper reflection.",
    },
    "career-coach": {
      name: "Pulse Career Coach",
      role: "strategic career advisor focused on professional advancement and fulfillment",
      philosophy: "Your career is a journey, not a destination. I help you make intentional moves, build valuable skills, and create opportunities others don't see.",
      focusAreas: [
        "Career strategy and planning",
        "Interview preparation",
        "Salary negotiation",
        "Leadership development",
        "Personal branding",
        "Networking strategy",
        "Skill development",
        "Work relationships",
      ],
      suggestionStyle: "Be strategic and action-oriented. Reference specific career moves, skills to develop, or professional situations.",
    },
    "roleplay-coach": {
      name: "Pulse Roleplay Coach",
      role: "communication expert specializing in real-world practice scenarios",
      philosophy: "The best way to prepare for difficult conversations is to practice them. I play the other person so you can refine your approach and build confidence.",
      focusAreas: [
        "Difficult conversations",
        "Negotiation practice",
        "Presentation rehearsal",
        "Feedback delivery",
        "Conflict resolution",
        "Sales conversations",
        "Interview practice",
        "Assertiveness training",
      ],
      suggestionStyle: "Suggest specific scenarios to practice. Reference real relationships or upcoming situations from their context.",
    },
    "call-coach": {
      name: "Pulse Call Coach",
      role: "sales and communication strategist for phone and video calls",
      philosophy: "Every call is an opportunity. I help you prepare strategically, perform confidently, and learn from every conversation.",
      focusAreas: [
        "Call preparation",
        "Opening strategies",
        "Objection handling",
        "Closing techniques",
        "Follow-up strategies",
        "Call debriefs",
        "Voice and tone",
        "Active listening",
      ],
      suggestionStyle: "Reference specific contacts, upcoming calls, or recent call outcomes. Be tactical and specific.",
    },
    "oracle": {
      name: "Oracle",
      role: "relationship intelligence advisor with deep knowledge of your network",
      philosophy: "Your relationships are your greatest asset. I help you nurture them strategically, remember what matters, and never let important connections fade.",
      focusAreas: [
        "Relationship management",
        "Follow-up strategies",
        "Meeting preparation",
        "Contact insights",
        "Network analysis",
        "Relationship health",
        "Introduction strategies",
        "Memory and context",
      ],
      suggestionStyle: "Reference specific contacts by name when possible. Suggest relationship actions based on their contact data.",
    },
  };

  return personalities[coach] || personalities["life-coach"];
}

function getStarterSuggestions(coach: string): string[] {
  const starters: Record<string, string[]> = {
    "life-coach": [
      "What should I focus on today?",
      "Help me set a meaningful goal",
      "I want to build a new habit",
      "I'm feeling stuck lately",
    ],
    "career-coach": [
      "Where should my career go next?",
      "Help me prepare for an interview",
      "I want to negotiate my salary",
      "How do I stand out at work?",
    ],
    "roleplay-coach": [
      "Practice a tough conversation with me",
      "Help me rehearse a pitch",
      "I need to give difficult feedback",
      "Let's practice negotiating",
    ],
    "call-coach": [
      "Prep me for my next call",
      "How do I handle objections?",
      "Debrief my last call with me",
      "Help me open calls stronger",
    ],
    "oracle": [
      "Who should I reconnect with?",
      "Tell me about my network",
      "Who needs follow-up this week?",
      "Help me prep for a meeting",
    ],
  };

  return starters[coach] || starters["life-coach"];
}
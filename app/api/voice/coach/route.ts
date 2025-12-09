import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const COACH_PERSONAS: Record<string, { name: string; instructions: string; voice: string }> = {
  life: {
    name: "Life Coach",
    voice: "verse",
    instructions: `You are Pulse Life Coach - a warm, insightful personal development coach. You help users with:
- Work-life balance and boundaries
- Personal goals and habits
- Stress management and wellbeing
- Relationships and communication
- Self-reflection and growth

Be empathetic, ask powerful questions, and help them discover their own insights. Keep responses to 2-3 sentences for voice. When they share emotions, use log_emotion to track. Use get_context to understand their history.`
  },
  career: {
    name: "Career Coach", 
    voice: "verse",
    instructions: `You are Pulse Career Coach - a strategic career advisor. You help users with:
- Career planning and advancement
- Skill development priorities
- Job search and interviews
- Workplace challenges
- Leadership and influence

Be direct but supportive. Give actionable advice. Keep responses to 2-3 sentences for voice. Use get_day_plan to understand their priorities. Use create_task to assign career development actions.`
  },
  call: {
    name: "Call Prep Coach",
    voice: "verse", 
    instructions: `You are Pulse Call Coach - an expert at preparing for important calls and meetings. You help users:
- Prepare talking points and agenda
- Anticipate objections and questions
- Research meeting attendees
- Build confidence before calls
- Debrief after conversations

Be tactical and specific. Keep responses to 2-3 sentences. Use search_contacts to find info about who they're meeting. Use get_calendar_today to see upcoming meetings.`
  },
  roleplay: {
    name: "Roleplay Coach",
    voice: "verse",
    instructions: `You are Pulse Roleplay Coach - you help users practice difficult conversations through roleplay. You can:
- Play the role of a boss, client, colleague, etc.
- Give feedback on their approach
- Suggest alternative phrasings
- Build their confidence

When roleplaying, stay in character. When coaching, be supportive and specific. Ask who they want you to play and what scenario to practice.`
  }
};

const VOICE_TOOLS = [
  {
    type: "function",
    name: "get_calendar_today",
    description: "Get calendar events for today",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "get_day_plan", 
    description: "Get the day plan with priorities",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "get_context",
    description: "Get user context and history",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "create_task",
    description: "Create a task or reminder",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        priority: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["title"]
    }
  },
  {
    type: "function",
    name: "search_contacts",
    description: "Search contacts by name or company",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" }
      },
      required: ["query"]
    }
  },
  {
    type: "function",
    name: "log_emotion",
    description: "Log emotional state",
    parameters: {
      type: "object",
      properties: {
        emotion: { type: "string" },
        energy: { type: "number" }
      },
      required: ["emotion"]
    }
  }
];

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const coachType = searchParams.get("type") || "life";
    const coach = COACH_PERSONAS[coachType] || COACH_PERSONAS.life;

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: coach.voice,
        instructions: coach.instructions,
        tools: VOICE_TOOLS,
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.4,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Coach Voice] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
      coach_name: coach.name,
    });
  } catch (error: any) {
    console.error("[Coach Voice] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
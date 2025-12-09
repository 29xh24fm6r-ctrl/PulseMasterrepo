import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

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
    description: "Get user context including recent events, insights, and memories",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "get_autonomy_suggestions",
    description: "Get AI-suggested actions",
    parameters: { type: "object", properties: {}, required: [] }
  }
];

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
        instructions: `You are Pulse delivering a morning briefing. When the user connects, immediately:

1. Greet them warmly with the time of day
2. Use get_calendar_today to fetch their schedule
3. Use get_day_plan to get their priorities
4. Use get_context for recent insights
5. Use get_autonomy_suggestions for recommended actions

Then deliver a concise, energizing morning brief covering:
- Key meetings and events today
- Top 3 priorities to focus on
- Any important insights or reminders
- One motivational thought

Keep it under 60 seconds. Be warm, confident, and set them up for a great day. After the brief, ask if they have any questions or want to dive deeper into anything.`,
        tools: VOICE_TOOLS,
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.4,
          prefix_padding_ms: 300,
          silence_duration_ms: 300,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Morning Voice] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
    });
  } catch (error: any) {
    console.error("[Morning Voice] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const VOICE_TOOLS = [
  {
    type: "function",
    name: "search_memories",
    description: "Search through stored memories and knowledge",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for" }
      },
      required: ["query"]
    }
  },
  {
    type: "function",
    name: "get_recent_events",
    description: "Get recent events and activities logged to Third Brain",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of events (default 10)" }
      },
      required: []
    }
  },
  {
    type: "function",
    name: "get_insights",
    description: "Get AI-generated insights and patterns",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "add_memory",
    description: "Store a new memory or piece of information",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "The information to remember" },
        category: { type: "string", description: "Category: personal, work, learning, health, relationship" }
      },
      required: ["content"]
    }
  },
  {
    type: "function",
    name: "search_contacts",
    description: "Search contact information",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name or company" }
      },
      required: ["query"]
    }
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
        instructions: `You are Pulse Third Brain - an intelligent memory and knowledge assistant. You are the user's external brain, helping them:

- Recall stored information ("What did I learn about React hooks?")
- Find patterns in their life ("What insights do you have?")
- Remember new things ("Remember that John's birthday is March 15")
- Search their contacts and interactions
- Surface relevant context

You have access to their entire memory bank. When they ask about something, search thoroughly. When they share information, store it.

Be like a brilliant assistant who remembers everything. Responses should be 2-3 sentences unless they ask for details.

Example interactions:
- "What do I know about [topic]?" → search_memories
- "Remember that [info]" → add_memory
- "What's been happening lately?" → get_recent_events
- "Any insights for me?" → get_insights`,
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
      console.error("[Third Brain Voice] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
    });
  } catch (error: any) {
    console.error("[Third Brain Voice] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
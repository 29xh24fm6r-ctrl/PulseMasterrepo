import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const VOICE_TOOLS = [
  {
    type: "function",
    name: "search_contacts",
    description: "Search contacts by name, company, or email",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, company, or email to search" }
      },
      required: ["query"]
    }
  },
  {
    type: "function",
    name: "get_contact_intel",
    description: "Get detailed intelligence about a specific contact including interaction history",
    parameters: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "The contact ID" }
      },
      required: ["contact_id"]
    }
  },
  {
    type: "function",
    name: "get_calendar_today",
    description: "Get today's calendar to see who user is meeting with",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "create_task",
    description: "Create a follow-up task related to a contact",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        priority: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["title"]
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
        instructions: `You are the Pulse Oracle - an intelligence specialist for relationship management. You help users:

- Research contacts before meetings ("Tell me about John Smith")
- Prepare for calls ("I'm about to call Sarah from Acme Corp")
- Track relationship status ("When did I last talk to Mike?")
- Plan follow-ups ("I should reconnect with my investors")

Use search_contacts to find people. Use get_calendar_today to see upcoming meetings and prep accordingly. Use create_task for follow-up reminders.

Be like a well-briefed executive assistant who knows everyone in their network. Keep responses concise (2-3 sentences) unless they ask for details. When they mention a name, immediately search for that contact.`,
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
      console.error("[Oracle Voice] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
    });
  } catch (error: any) {
    console.error("[Oracle Voice] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
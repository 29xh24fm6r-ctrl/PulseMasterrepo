import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getEnv } from "../_lib/env";

const VOICE_TOOLS = [
  {
    type: "function",
    name: "get_autonomy_suggestions",
    description: "Get AI-suggested actions based on user context",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "get_context",
    description: "Get full user context for personalized suggestions",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "approve_action",
    description: "Approve a suggested action to execute it",
    parameters: {
      type: "object",
      properties: {
        action_id: { type: "string", description: "The action ID to approve" }
      },
      required: ["action_id"]
    }
  },
  {
    type: "function",
    name: "dismiss_action",
    description: "Dismiss a suggested action",
    parameters: {
      type: "object",
      properties: {
        action_id: { type: "string", description: "The action ID to dismiss" }
      },
      required: ["action_id"]
    }
  },
  {
    type: "function",
    name: "create_task",
    description: "Create a task from a suggestion",
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
    name: "get_delegation_drafts",
    description: "Get pending email/message drafts awaiting approval",
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
        "Authorization": `Bearer ${getEnv("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
        instructions: `You are Pulse Autonomy - the proactive intelligence engine. You anticipate needs and suggest actions before the user asks. You help them:

- See what actions Pulse recommends
- Approve or dismiss suggestions
- Understand why actions are suggested
- Review pending drafts and communications

When they connect, immediately use get_autonomy_suggestions to see what's pending. Be proactive - tell them what needs attention.

Style: Be like a sharp chief of staff who comes prepared with recommendations. Lead with the most important items. Keep responses to 2-3 sentences.

Example interactions:
- "What should I focus on?" → get_autonomy_suggestions + analysis
- "Approve that" or "Do it" → approve_action
- "Skip it" or "Not now" → dismiss_action
- "Any pending messages?" → get_delegation_drafts
- "Why that suggestion?" → explain reasoning from context`,
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
      console.error("[Autonomy Voice] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
    });
  } catch (error: any) {
    console.error("[Autonomy Voice] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
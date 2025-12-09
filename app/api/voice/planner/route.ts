import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const VOICE_TOOLS = [
  {
    type: "function",
    name: "get_day_plan",
    description: "Get the current day plan with all items",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "get_calendar_today",
    description: "Get calendar events for today",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "create_task",
    description: "Create a new task",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        priority: { type: "string", enum: ["high", "medium", "low"] },
        scheduled_time: { type: "string", description: "Time to schedule (e.g. 9am, 2:30pm)" }
      },
      required: ["title"]
    }
  },
  {
    type: "function",
    name: "complete_task",
    description: "Mark a task as complete",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The task ID to complete" }
      },
      required: ["task_id"]
    }
  },
  {
    type: "function",
    name: "reschedule_task",
    description: "Move a task to a different time",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The task ID" },
        new_time: { type: "string", description: "New scheduled time" }
      },
      required: ["task_id", "new_time"]
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
        instructions: `You are Pulse Planner - an expert at helping users organize their day. You can:

- Show their current day plan and priorities
- Add new tasks with scheduling
- Mark tasks complete
- Reschedule items
- Suggest optimal time blocking

When they connect, use get_day_plan to see their current plan. Be proactive - suggest improvements to their schedule. Keep responses to 2-3 sentences. Use specific times when scheduling.

Example interactions:
- "Add a task to call John at 2pm" → create_task with scheduled_time
- "What's my plan look like?" → get_day_plan
- "Move my 3pm meeting prep to tomorrow" → reschedule_task
- "Done with emails" → complete_task`,
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
      console.error("[Planner Voice] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
    });
  } catch (error: any) {
    console.error("[Planner Voice] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
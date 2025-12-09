import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const VOICE_TOOLS = [
  {
    type: "function",
    name: "get_tasks",
    description: "Get all pending tasks",
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
        due_date: { type: "string", description: "Due date (today, tomorrow, or specific date)" }
      },
      required: ["title"]
    }
  },
  {
    type: "function",
    name: "complete_task",
    description: "Mark a task as complete by name or ID",
    parameters: {
      type: "object",
      properties: {
        task_identifier: { type: "string", description: "Task name or ID" }
      },
      required: ["task_identifier"]
    }
  },
  {
    type: "function",
    name: "prioritize_task",
    description: "Change task priority",
    parameters: {
      type: "object",
      properties: {
        task_identifier: { type: "string", description: "Task name or ID" },
        priority: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["task_identifier", "priority"]
    }
  },
  {
    type: "function",
    name: "get_tasks_by_priority",
    description: "Get tasks filtered by priority level",
    parameters: {
      type: "object",
      properties: {
        priority: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["priority"]
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
        instructions: `You are Pulse Tasks - a rapid task capture and management assistant. You help users:

- Quickly add tasks by voice ("Add buy groceries")
- Mark tasks done ("Done with the report")
- Check what's pending ("What do I need to do?")
- Prioritize work ("Make the client call high priority")

Be extremely efficient. When they say something that sounds like a task, just add it - don't ask for confirmation. Confirm with a brief "Added" or "Done".

Quick patterns:
- "Add [task]" or "Remind me to [task]" → create_task
- "Done with [task]" or "Finished [task]" → complete_task
- "What's on my list?" → get_tasks
- "High priority tasks" → get_tasks_by_priority

Keep all responses under 2 sentences. Be snappy.`,
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
      console.error("[Tasks Voice] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
    });
  } catch (error: any) {
    console.error("[Tasks Voice] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
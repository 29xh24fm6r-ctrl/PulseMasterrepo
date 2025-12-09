import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const VOICE_TOOLS = [
  // Calendar
  {
    type: "function",
    name: "get_calendar_today",
    description: "Get calendar events for today",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    type: "function",
    name: "create_calendar_event",
    description: "Create a new calendar event or meeting. Use this when user wants to schedule something.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title (e.g. 'Lunch with John', 'Team meeting')" },
        start_time: { type: "string", description: "When the event starts (e.g. 'tomorrow at 2pm', 'Monday 10am', 'next Friday afternoon')" },
        duration_minutes: { type: "number", description: "Duration in minutes (default 60)" },
        location: { type: "string", description: "Where the event takes place" },
        attendees: { type: "array", items: { type: "string" }, description: "List of attendee names or emails" }
      },
      required: ["title", "start_time"]
    }
  },
  {
    type: "function",
    name: "update_calendar_event",
    description: "Update an existing calendar event",
    parameters: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "The event ID to update" },
        title: { type: "string", description: "New title" },
        start_time: { type: "string", description: "New start time" },
        location: { type: "string", description: "New location" }
      },
      required: ["event_id"]
    }
  },
  {
    type: "function",
    name: "delete_calendar_event",
    description: "Cancel/delete a calendar event",
    parameters: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "The event ID to delete" }
      },
      required: ["event_id"]
    }
  },
  // Day Plan
  {
    type: "function",
    name: "get_day_plan",
    description: "Get the day plan with priorities and scheduled items",
    parameters: { type: "object", properties: {}, required: [] }
  },
  // Tasks
  {
    type: "function",
    name: "get_tasks",
    description: "Get pending tasks",
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
        priority: { type: "string", enum: ["high", "medium", "low"], description: "Task priority" },
        due_date: { type: "string", description: "Due date (today, tomorrow, or specific date)" }
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
        task_identifier: { type: "string", description: "Task name or ID" }
      },
      required: ["task_identifier"]
    }
  },
  // Contacts
  {
    type: "function",
    name: "search_contacts",
    description: "Search contacts by name, company, or email",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" }
      },
      required: ["query"]
    }
  },
  // Memory
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
    name: "add_memory",
    description: "Store a new memory or piece of information",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "The information to remember" },
        category: { type: "string", description: "Category: personal, work, learning, health" }
      },
      required: ["content"]
    }
  },
  // Emotions
  {
    type: "function",
    name: "log_emotion",
    description: "Track how the user is feeling",
    parameters: {
      type: "object",
      properties: {
        emotion: { type: "string", description: "The emotion (happy, stressed, anxious, calm, excited, tired)" },
        energy: { type: "number", description: "Energy level 1-10" }
      },
      required: ["emotion"]
    }
  },
  // Autonomy
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
        instructions: `You are Pulse, an elite AI executive assistant and life coach. You have access to the user's calendar, tasks, contacts, and memories.

PERSONALITY:
- Warm but efficient
- Proactive and anticipatory
- Confident and decisive
- Concise (1-3 sentences unless details requested)

CAPABILITIES:
- Calendar: View today's events, CREATE new events ("Schedule lunch with John tomorrow at noon"), update or cancel events
- Tasks: View, create, complete tasks
- Contacts: Search and get intel on people
- Memory: Search past knowledge, remember new information
- Emotions: Track how they're feeling

SCHEDULING EVENTS:
When users say things like "schedule", "set up", "book", "add to calendar", "meeting with", "lunch with", immediately use create_calendar_event. Parse natural language times:
- "tomorrow at 2pm" → tomorrow, 14:00
- "next Monday morning" → next Monday, 9:00
- "Friday afternoon" → Friday, 14:00
- "in an hour" → current time + 1 hour

BEHAVIOR:
- Start by briefly acknowledging, then take action
- When scheduling, confirm the details after creating
- Be proactive - if they mention a person, offer to look them up
- Keep it conversational and natural`,
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
      console.error("[Realtime Config] OpenAI error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      client_secret: data.client_secret?.value || data.client_secret,
      session_id: data.id,
    });
  } catch (error: any) {
    console.error("[Realtime Config] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
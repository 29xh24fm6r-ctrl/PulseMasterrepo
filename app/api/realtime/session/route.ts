import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'shimmer',
        instructions: `You are Pulse, a warm and intelligent AI companion. You're having a natural voice conversation.

TODAY: ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
TOMORROW: ${tomorrow.toISOString().split('T')[0]}
NEXT WEEK: ${nextWeek.toISOString().split('T')[0]}

PERSONALITY:
- Warm, supportive, genuinely caring — like a brilliant best friend
- Concise — 1-2 sentences max unless they want more
- Use contractions naturally (I'm, you're, let's, don't)
- Match their energy — excited when they're up, gentle when down
- Action-oriented — when they want something done, DO IT

UNDERSTANDING NATURAL LANGUAGE:
Users speak naturally. Understand what they MEAN:
- "I need to call Mike tomorrow" → They want a task created
- "Remind me to..." / "Don't let me forget..." → Task
- "Did my workout" / "Just exercised" → Log the habit
- "What's on my plate?" / "What do I have today?" → Tell them their tasks  
- "Show me my journal" / "Let me reflect" → Navigate to journal
- "How's the Acme deal?" → Look up that deal
- "I finished the proposal" → Complete that task

WHEN TO USE TOOLS:
Use your tools when users want actions:
- create_task: Any "I need to...", "remind me to...", "don't forget..."
- log_habit: Any "did my...", "finished my...", "logged..."
- complete_task: Any "I finished...", "done with...", "completed..."
- get_tasks: Any "what's today?", "what do I have?", "my schedule?"
- navigate: Any "show me...", "open...", "take me to..."

RESPONSE STYLE:
After taking action, confirm BRIEFLY and WARMLY:
- "Got it — added to tomorrow's list." 
- "Nice! That's 5 days in a row 🔥"
- "Opening your journal..."
- "You've got 3 tasks today — the proposal is the priority."

NEVER:
- Give long explanations
- Sound robotic
- Ask "How can I help?"
- Say "I've successfully..."
- Use bullet points in speech`,
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
        },
        tools: [
          {
            type: 'function',
            name: 'create_task',
            description: 'Create a task/reminder. Use when user says they need to do something, want to remember something, or asks you to remind them.',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'What needs to be done' },
                priority: { type: 'string', enum: ['High', 'Medium', 'Low'], description: 'Urgency level' },
                due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
              },
              required: ['title']
            }
          },
          {
            type: 'function',
            name: 'complete_task',
            description: 'Mark a task as done. Use when user says they finished or completed something.',
            parameters: {
              type: 'object',
              properties: {
                task_search: { type: 'string', description: 'Task name or keyword to find it' }
              },
              required: ['task_search']
            }
          },
          {
            type: 'function',
            name: 'log_habit',
            description: 'Log a habit as completed. Use when user says they did their workout, meditation, reading, etc.',
            parameters: {
              type: 'object',
              properties: {
                habit_name: { type: 'string', description: 'Name of the habit (workout, meditation, reading, etc.)' }
              },
              required: ['habit_name']
            }
          },
          {
            type: 'function',
            name: 'get_tasks',
            description: 'Get user tasks. Use when they ask what they have to do, their schedule, or what\'s on their plate.',
            parameters: {
              type: 'object',
              properties: {
                filter: { type: 'string', enum: ['today', 'overdue', 'all'], description: 'Which tasks to get' }
              },
              required: ['filter']
            }
          },
          {
            type: 'function',
            name: 'get_deals',
            description: 'Get deal information. Use when user asks about a deal, client, or their pipeline.',
            parameters: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Deal or company name to search for (optional)' }
              }
            }
          },
          {
            type: 'function',
            name: 'get_habits',
            description: 'Get habit status. Use when user asks about their habits, streaks, or progress.',
            parameters: {
              type: 'object',
              properties: {}
            }
          },
          {
            type: 'function',
            name: 'navigate',
            description: 'Navigate to a page. Use when user wants to see or open something specific.',
            parameters: {
              type: 'object',
              properties: {
                page: { 
                  type: 'string', 
                  enum: ['journal', 'tasks', 'deals', 'habits', 'contacts', 'dashboard', 'morning-brief', 'follow-ups'],
                  description: 'Page to navigate to'
                }
              },
              required: ['page']
            }
          },
          {
            type: 'function',
            name: 'create_follow_up',
            description: 'Create a follow-up reminder for a person. Use when user needs to follow up with someone.',
            parameters: {
              type: 'object',
              properties: {
                person: { type: 'string', description: 'Name of person to follow up with' },
                reason: { type: 'string', description: 'What to follow up about' },
                due_date: { type: 'string', description: 'When to follow up (YYYY-MM-DD)' }
              },
              required: ['person', 'reason']
            }
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI Realtime session error:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      client_secret: data.client_secret.value,
      expires_at: data.client_secret.expires_at,
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
// Pulse OS - Intelligent Voice Actions (Supabase Backend)
// app/api/pulse/intelligent/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

import { createTask, completeTask, getTasks } from '@/lib/data/tasks';
import { logHabitCompletion, getHabits } from '@/lib/data/habits';
import { getDeals } from '@/lib/data/deals';
import { createFollowUp } from '@/lib/data/followups';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, messages = [] } = await request.json();

    // Usage check
    const usageCheck = await canMakeAICall(userId, "pulse_intelligent", 5);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get user message
    const userMessage = message || messages[messages.length - 1]?.content;
    if (!userMessage) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Step 1: Understand intent
    const intents = await inferIntent(userMessage, today, tomorrow, nextWeek);
    console.log('[Intelligent] Intents:', JSON.stringify(intents, null, 2));

    // Step 2: Execute actions
    const executedActions: any[] = [];
    let navigationUrl: string | null = null;

    for (const intent of intents) {
      if (intent.confidence >= 0.7 && intent.intentType !== 'CONVERSATION') {
        const result = await executeAction(userId, intent.intentType, intent.payload);
        executedActions.push({ type: intent.intentType, result });

        if (result.navigate) {
          navigationUrl = result.navigate;
        }
      }
    }

    // Step 3: Generate natural response
    const response = await generateResponse(
      userMessage,
      messages,
      executedActions,
      today
    );

    return NextResponse.json({
      response,
      intents,
      actions: executedActions,
      navigate: navigationUrl,
    });

  } catch (error) {
    console.error('[Intelligent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================
// INTENT INFERENCE
// ============================================

async function inferIntent(
  text: string,
  today: Date,
  tomorrow: Date,
  nextWeek: Date
): Promise<any[]> {

  const prompt = `You understand natural language and infer what users want.

CURRENT DATE: ${today.toISOString().split('T')[0]}
TOMORROW: ${tomorrow.toISOString().split('T')[0]}
NEXT WEEK (Monday): ${nextWeek.toISOString().split('T')[0]}

USER SAID: "${text}"

Infer the user's intent. Return a JSON object with "intents" array.

Each intent needs:
- intentType: One of [CREATE_TASK, COMPLETE_TASK, LOG_HABIT, GET_TASKS, GET_DEALS, GET_HABITS, NAVIGATE, UPDATE_DEAL, CREATE_CONTACT, CREATE_FOLLOW_UP, CONVERSATION]
- confidence: 0.0 to 1.0
- payload: Data needed for the action

INTENT GUIDELINES:
- "I need to call Mike tomorrow" → CREATE_TASK { title: "Call Mike", due_date: "YYYY-MM-DD", priority: "Medium" }
- "remind me to..." / "don't forget to..." → CREATE_TASK
- "follow up with Sarah about the proposal" → CREATE_FOLLOW_UP { person: "Sarah", reason: "the proposal", due_date: "..." }
- "I did my workout" / "just finished exercising" → LOG_HABIT { habit_name: "workout" }
- "logged my meditation" → LOG_HABIT { habit_name: "meditation" }
- "what's on my plate?" / "what do I have today?" → GET_TASKS { filter: "today" }
- "how's my day looking?" → GET_TASKS { filter: "today" }
- "show me my deals" / "how are my deals?" → GET_DEALS {}
- "what about Acme?" / "update on [company]" → GET_DEALS { search: "Acme" }
- "open my journal" / "let me reflect" → NAVIGATE { page: "journal" }
- "take me to tasks" / "show me tasks" → NAVIGATE { page: "tasks" }
- "I finished the proposal" / "done with..." → COMPLETE_TASK { task_search: "proposal" }

DATE PARSING:
- "tomorrow" = ${tomorrow.toISOString().split('T')[0]}
- "next week" = ${nextWeek.toISOString().split('T')[0]}
- "end of week" = Friday
- "in a few days" = 3 days from now

If just chatting with no action, use CONVERSATION.

Output ONLY valid JSON:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{"intents":[]}';
    const parsed = JSON.parse(content);
    return parsed.intents || [];

  } catch (error) {
    console.error('[Intent] Error:', error);
    return [{ intentType: 'CONVERSATION', confidence: 1.0, payload: {} }];
  }
}

// ============================================
// ACTION EXECUTION
// ============================================

async function executeAction(userId: string, actionType: string, payload: any): Promise<any> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  console.log('[Execute]', actionType, payload);

  try {
    switch (actionType) {
      // ----------------------------------------
      // CREATE TASK
      // ----------------------------------------
      case 'CREATE_TASK': {
        const newTask = await createTask(userId, {
          title: payload.title,
          due_at: payload.due_date, // assuming createTask handles formatting or null, mapping payload key
          priority: payload.priority || 'Medium',
          status: 'todo'
        });

        return {
          success: true,
          message: `Created task: "${newTask.title}"`
        };
      }

      // ----------------------------------------
      // COMPLETE TASK
      // ----------------------------------------
      case 'COMPLETE_TASK': {
        // Find task first (fuzzy search)
        const allTasks = await getTasks(userId);
        const activeTasks = allTasks.filter(t => t.status !== 'done');
        const search = payload.task_search.toLowerCase();

        const match = activeTasks.find(t => t.title.toLowerCase().includes(search));

        if (!match) {
          return { success: false, error: `No task found matching "${payload.task_search}"` };
        }

        await completeTask(userId, match.id);

        return { success: true, message: `Completed: "${match.title}"` };
      }

      // ----------------------------------------
      // LOG HABIT
      // ----------------------------------------
      case 'LOG_HABIT': {
        const habits = await getHabits(userId);
        const search = payload.habit_name.toLowerCase();
        // Find best match
        const match = habits.find(h => h.name.toLowerCase().includes(search));

        if (!match) {
          return { success: false, error: `No habit found matching "${payload.habit_name}"` };
        }

        const result = await logHabitCompletion(userId, match.id, match.xp_reward || 10);

        return {
          success: true,
          message: `Logged ${match.name} — ${result.streak} day streak! 🔥`,
          streak: result.streak,
        };
      }

      // ----------------------------------------
      // GET TASKS
      // ----------------------------------------
      case 'GET_TASKS': {
        const tasks = await getTasks(userId);

        let filtered = tasks.filter(t => t.status !== 'done');

        if (payload.filter === 'today') {
          filtered = filtered.filter(t => t.due_at?.startsWith(todayStr));
        } else if (payload.filter === 'overdue') {
          filtered = filtered.filter(t => t.due_at && t.due_at < todayStr);
        }

        const taskList = filtered.slice(0, 10).map(t => ({
          name: t.title,
          priority: t.priority,
          dueDate: t.due_at,
        }));

        return {
          success: true,
          count: taskList.length,
          tasks: taskList,
          message: `You have ${taskList.length} task${taskList.length === 1 ? '' : 's'}${payload.filter === 'today' ? ' today' : ''}`,
        };
      }

      // ----------------------------------------
      // GET DEALS
      // ----------------------------------------
      case 'GET_DEALS': {
        const deals = await getDeals(userId);
        let filtered = deals.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage));

        if (payload.search) {
          const s = payload.search.toLowerCase();
          filtered = filtered.filter(d => d.title.toLowerCase().includes(s) || d.company.toLowerCase().includes(s));
        }

        const dealList = filtered.slice(0, 5).map(d => ({
          name: d.title,
          company: d.company,
          stage: d.stage,
          value: d.value,
        }));

        return {
          success: true,
          count: dealList.length,
          deals: dealList,
          message: payload.search
            ? `Found ${dealList.length} deal${dealList.length === 1 ? '' : 's'} matching "${payload.search}"`
            : `You have ${dealList.length} active deal${dealList.length === 1 ? '' : 's'}`,
        };
      }

      // ----------------------------------------
      // GET HABITS
      // ----------------------------------------
      case 'GET_HABITS': {
        const habits = await getHabits(userId);

        const habitList = habits.map(h => ({
          name: h.name,
          streak: h.streak || 0,
          completedToday: h.last_completed_at?.startsWith(todayStr)
        }));

        const completedToday = habitList.filter(h => h.completedToday).length;

        return {
          success: true,
          total: habitList.length,
          completedToday,
          habits: habitList,
          message: `${completedToday}/${habitList.length} habits done today`,
        };
      }

      // ----------------------------------------
      // NAVIGATE
      // ----------------------------------------
      case 'NAVIGATE': {
        const routes: Record<string, string> = {
          journal: '/journal',
          tasks: '/tasks',
          deals: '/deals',
          habits: '/habits',
          contacts: '/second-brain',
          'second brain': '/second-brain',
          dashboard: '/',
          home: '/',
          'morning brief': '/morning-brief',
          'follow-ups': '/follow-ups',
          'follow ups': '/follow-ups',
          voice: '/voice',
          settings: '/settings',
        };

        const page = payload.page?.toLowerCase();
        const url = routes[page] || '/';

        return {
          success: true,
          navigate: url,
          message: `Opening ${payload.page}...`,
        };
      }

      // ----------------------------------------
      // CREATE FOLLOW UP
      // ----------------------------------------
      case 'CREATE_FOLLOW_UP': {
        const followUp = await createFollowUp(userId, {
          name: `Follow up: ${payload.person} - ${payload.reason}`,
          type: 'Follow-up',
          due_date: payload.due_date,
          status: 'pending',
          priority: 'Medium'
        });

        return { success: true, message: `Created follow-up with ${payload.person}` };
      }

      // ----------------------------------------
      // CONVERSATION (no action needed)
      // ----------------------------------------
      case 'CONVERSATION':
        return { success: true, message: 'Just chatting' };

      default:
        return { success: false, error: `Unknown action: ${actionType}` };
    }
  } catch (error) {
    console.error('[Execute] Error:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// RESPONSE GENERATION
// ============================================

async function generateResponse(
  userMessage: string,
  previousMessages: any[],
  executedActions: any[],
  today: Date
): Promise<string> {

  const actionContext = executedActions.length > 0
    ? `\n\nACTIONS JUST TAKEN:\n${executedActions.map(a => `- ${a.result.message || a.type}`).join('\n')}`
    : '';

  const systemPrompt = `You are Pulse, a warm and intelligent AI companion. You just helped the user with something.

TODAY: ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

PERSONALITY:
- Warm, friendly, supportive — like a brilliant best friend
- Concise — keep responses to 1-3 sentences
- Natural — use contractions, be conversational
- Celebratory — acknowledge wins with genuine enthusiasm
- Proactive — offer follow-up help when relevant

${actionContext}

Respond naturally to acknowledge what you did. If you created something, confirm it warmly. If you showed data, summarize it helpfully. If you're navigating somewhere, let them know.

Keep it SHORT and CONVERSATIONAL. No bullet points. No formal language.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...previousMessages.slice(-4),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    return response.choices[0].message.content || "Got it!";

  } catch (error) {
    // Fallback to action message
    if (executedActions.length > 0) {
      return executedActions[0].result.message || "Done!";
    }
    return "I'm here to help!";
  }
}
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
// Pulse OS - Intelligent Voice Actions (Notion Backend)
// app/api/pulse/intelligent/route.ts
//
// Drop-in replacement that works with your existing Notion setup

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Client } from '@notionhq/client';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Database IDs
const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
const HABITS_DB = process.env.NOTION_DATABASE_HABITS;
const DEALS_DB = process.env.NOTION_DATABASE_DEALS;
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;
const FOLLOW_UPS_DB = process.env.NOTION_DATABASE_FOLLOW_UPS;

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: Request) {
  try {
    const { message, messages = [], userId = 'default' } = await request.json();
    
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
        const result = await executeAction(intent.intentType, intent.payload);
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

async function executeAction(actionType: string, payload: any): Promise<any> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  console.log('[Execute]', actionType, payload);
  
  try {
    switch (actionType) {
      // ----------------------------------------
      // CREATE TASK
      // ----------------------------------------
      case 'CREATE_TASK': {
        if (!TASKS_DB) return { success: false, error: 'Tasks DB not configured' };
        
        const properties: any = {
          Name: { title: [{ text: { content: payload.title } }] },
          Status: { select: { name: 'Not Started' } },
        };
        
        if (payload.priority) {
          properties.Priority = { select: { name: payload.priority } };
        }
        if (payload.due_date) {
          properties['Due Date'] = { date: { start: payload.due_date } };
        }
        
        await notion.pages.create({
          parent: { database_id: TASKS_DB },
          properties,
        });
        
        return { 
          success: true, 
          message: `Created task: "${payload.title}"${payload.due_date ? ` for ${formatDate(payload.due_date)}` : ''}` 
        };
      }
      
      // ----------------------------------------
      // COMPLETE TASK
      // ----------------------------------------
      case 'COMPLETE_TASK': {
        if (!TASKS_DB) return { success: false, error: 'Tasks DB not configured' };
        
        const tasks = await notion.databases.query({
          database_id: TASKS_DB,
          filter: {
            and: [
              { property: 'Name', title: { contains: payload.task_search } },
              { property: 'Status', select: { does_not_equal: 'Done' } },
            ]
          },
          page_size: 1,
        });
        
        if (tasks.results.length === 0) {
          return { success: false, error: `No task found matching "${payload.task_search}"` };
        }
        
        const task = tasks.results[0] as any;
        const taskName = task.properties.Name?.title?.[0]?.text?.content;
        
        await notion.pages.update({
          page_id: task.id,
          properties: { Status: { select: { name: 'Done' } } },
        });
        
        return { success: true, message: `Completed: "${taskName}"` };
      }
      
      // ----------------------------------------
      // LOG HABIT
      // ----------------------------------------
      case 'LOG_HABIT': {
        if (!HABITS_DB) return { success: false, error: 'Habits DB not configured' };
        
        const habits = await notion.databases.query({
          database_id: HABITS_DB,
          filter: { property: 'Name', title: { contains: payload.habit_name } },
          page_size: 1,
        });
        
        if (habits.results.length === 0) {
          return { success: false, error: `No habit found matching "${payload.habit_name}"` };
        }
        
        const habit = habits.results[0] as any;
        const habitName = habit.properties.Name?.title?.[0]?.text?.content;
        const currentStreak = habit.properties.Streak?.number || 0;
        
        await notion.pages.update({
          page_id: habit.id,
          properties: {
            'Last Completed': { date: { start: todayStr } },
            Streak: { number: currentStreak + 1 },
          },
        });
        
        return { 
          success: true, 
          message: `Logged ${habitName} — ${currentStreak + 1} day streak! 🔥`,
          streak: currentStreak + 1,
        };
      }
      
      // ----------------------------------------
      // GET TASKS
      // ----------------------------------------
      case 'GET_TASKS': {
        if (!TASKS_DB) return { success: false, error: 'Tasks DB not configured' };
        
        let filter: any = { property: 'Status', select: { does_not_equal: 'Done' } };
        
        if (payload.filter === 'today') {
          filter = {
            and: [
              { property: 'Due Date', date: { equals: todayStr } },
              { property: 'Status', select: { does_not_equal: 'Done' } },
            ]
          };
        } else if (payload.filter === 'overdue') {
          filter = {
            and: [
              { property: 'Due Date', date: { before: todayStr } },
              { property: 'Status', select: { does_not_equal: 'Done' } },
            ]
          };
        }
        
        const tasks = await notion.databases.query({
          database_id: TASKS_DB,
          filter,
          page_size: 10,
        });
        
        const taskList = tasks.results.map((t: any) => ({
          name: t.properties.Name?.title?.[0]?.text?.content,
          priority: t.properties.Priority?.select?.name,
          dueDate: t.properties['Due Date']?.date?.start,
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
        if (!DEALS_DB) return { success: false, error: 'Deals DB not configured' };
        
        let filter: any = {
          property: 'Stage',
          select: { does_not_equal: 'Closed Lost' },
        };
        
        if (payload.search) {
          filter = {
            and: [
              filter,
              {
                or: [
                  { property: 'Name', title: { contains: payload.search } },
                  { property: 'Company', rich_text: { contains: payload.search } },
                ]
              }
            ]
          };
        }
        
        const deals = await notion.databases.query({
          database_id: DEALS_DB,
          filter,
          page_size: 5,
        });
        
        const dealList = deals.results.map((d: any) => ({
          name: d.properties.Name?.title?.[0]?.text?.content,
          company: d.properties.Company?.rich_text?.[0]?.text?.content,
          stage: d.properties.Stage?.select?.name,
          value: d.properties.Value?.number,
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
        if (!HABITS_DB) return { success: false, error: 'Habits DB not configured' };
        
        const habits = await notion.databases.query({
          database_id: HABITS_DB,
          page_size: 10,
        });
        
        const habitList = habits.results.map((h: any) => {
          const lastCompleted = h.properties['Last Completed']?.date?.start;
          return {
            name: h.properties.Name?.title?.[0]?.text?.content,
            streak: h.properties.Streak?.number || 0,
            completedToday: lastCompleted === todayStr,
          };
        });
        
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
        if (!FOLLOW_UPS_DB) {
          // Fall back to creating a task
          if (TASKS_DB) {
            await notion.pages.create({
              parent: { database_id: TASKS_DB },
              properties: {
                Name: { title: [{ text: { content: `Follow up with ${payload.person}: ${payload.reason}` } }] },
                Status: { select: { name: 'Not Started' } },
                Priority: { select: { name: 'Medium' } },
                ...(payload.due_date && { 'Due Date': { date: { start: payload.due_date } } }),
              },
            });
            return { success: true, message: `Created follow-up with ${payload.person}` };
          }
          return { success: false, error: 'Follow-ups DB not configured' };
        }
        
        await notion.pages.create({
          parent: { database_id: FOLLOW_UPS_DB },
          properties: {
            Name: { title: [{ text: { content: `Follow up with ${payload.person}: ${payload.reason}` } }] },
            Status: { select: { name: 'Pending' } },
            ...(payload.due_date && { 'Due Date': { date: { start: payload.due_date } } }),
          },
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

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (dateStr === today.toISOString().split('T')[0]) return 'today';
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'tomorrow';
  
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}
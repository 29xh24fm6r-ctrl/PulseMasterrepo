import { auth } from '@clerk/nextjs/server';
import { canMakeAICall, trackAIUsage } from '@/lib/services/usage';
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import OpenAI from 'openai';
import { loadKernel, loadRelevantModules, detectRelevantModules } from '../../../lib/brain-loader';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Message type for conversation history
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Fetch tasks from Notion
async function getTasks() {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_TASKS_DB!,
      filter: {
        property: 'Status',
        status: {
          does_not_equal: 'Done',
        },
      },
      sorts: [{ property: 'Due Date', direction: 'ascending' }],
      page_size: 20,
    });

    return response.results.map((page: any) => ({
      id: page.id,
      title: page.properties['Task Name']?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties['Status']?.status?.name || 'Unknown',
      priority: page.properties['Priority']?.select?.name || 'Medium',
      dueDate: page.properties['Due Date']?.date?.start || null,
      category: page.properties['Category']?.multi_select?.map((c: any) => c.name) || [],
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

// Fetch deals from Notion
async function getDeals() {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DEALS_DB!,
      filter: {
        property: 'Stage',
        select: {
          does_not_equal: 'Closed Lost',
        },
      },
      sorts: [{ property: 'Expected Close', direction: 'ascending' }],
      page_size: 20,
    });

    return response.results.map((page: any) => ({
      id: page.id,
      name: page.properties['Deal Name']?.title?.[0]?.plain_text || 'Untitled',
      company: page.properties['Company']?.rich_text?.[0]?.plain_text || '',
      amount: page.properties['Amount']?.number || 0,
      stage: page.properties['Stage']?.select?.name || 'Unknown',
      expectedClose: page.properties['Expected Close']?.date?.start || null,
      nextStep: page.properties['Next Step']?.rich_text?.[0]?.plain_text || '',
    }));
  } catch (error) {
    console.error('Error fetching deals:', error);
    return [];
  }
}

// Fetch contacts from Notion
async function getContacts() {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_CONTACTS_DB!,
      sorts: [{ property: 'Last Contact', direction: 'descending' }],
      page_size: 20,
    });

    return response.results.map((page: any) => ({
      id: page.id,
      name: page.properties['Name']?.title?.[0]?.plain_text || 'Unknown',
      company: page.properties['Company']?.rich_text?.[0]?.plain_text || '',
      email: page.properties['Email']?.email || '',
      phone: page.properties['Phone']?.phone_number || '',
      type: page.properties['Type']?.select?.name || '',
      lastContact: page.properties['Last Contact']?.date?.start || null,
    }));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
}

// Build context about user's current state
async function buildUserContext() {
  const [tasks, deals, contacts] = await Promise.all([
    getTasks(),
    getDeals(),
    getContacts(),
  ]);

  const today = new Date().toISOString().split('T')[0];
  
  // Filter relevant data
  const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today);
  const todayTasks = tasks.filter(t => t.dueDate === today);
  const highPriorityTasks = tasks.filter(t => t.priority === 'High');
  const activeDeals = deals.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage));
  
  return `
## YOUR CURRENT STATE (Live from Notion)

### Tasks Overview
- Total Active Tasks: ${tasks.length}
- Overdue: ${overdueTasks.length}
- Due Today: ${todayTasks.length}
- High Priority: ${highPriorityTasks.length}

${overdueTasks.length > 0 ? `### Overdue Tasks (URGENT)
${overdueTasks.map(t => `- "${t.title}" (Due: ${t.dueDate}, Priority: ${t.priority})`).join('\n')}
` : ''}

${todayTasks.length > 0 ? `### Due Today
${todayTasks.map(t => `- "${t.title}" (Priority: ${t.priority})`).join('\n')}
` : ''}

${highPriorityTasks.length > 0 ? `### High Priority Tasks
${highPriorityTasks.slice(0, 5).map(t => `- "${t.title}" (Due: ${t.dueDate || 'No date'})`).join('\n')}
` : ''}

### Deals Pipeline
- Active Deals: ${activeDeals.length}
- Total Pipeline Value: $${activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}

${activeDeals.length > 0 ? `### Active Deals
${activeDeals.slice(0, 5).map(d => `- "${d.name}" - ${d.company} - $${d.amount?.toLocaleString() || 0} - Stage: ${d.stage}${d.nextStep ? ` - Next: ${d.nextStep}` : ''}`).join('\n')}
` : ''}

### Contacts
- Total Contacts: ${contacts.length}
${contacts.slice(0, 5).map(c => `- ${c.name}${c.company ? ` (${c.company})` : ''}`).join('\n')}
`;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const usageCheck = await canMakeAICall(userId, "pulse_chat", 5);
  if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });
  try {
    const { messages }: { messages: Message[] } = await request.json();
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Load relevant brain modules based on the conversation
    console.log('Loading brain modules...');
    const relevantModules = detectRelevantModules(lastUserMessage);
    console.log('Detected relevant modules:', relevantModules);
    
    const brainContent = await loadRelevantModules(lastUserMessage);
    console.log('Brain content loaded, length:', brainContent.length);
    
    // Get user's current context from Notion
    console.log('Fetching user context from Notion...');
    const userContext = await buildUserContext();
    
    // Build the system prompt
    const systemPrompt = `${brainContent}

---

${userContext}

---

## CRITICAL INSTRUCTIONS

You are Pulse, having a natural conversation. Follow the Kernel operating loop:
1. Detect the domain and emotional state
2. Select the appropriate persona mode
3. Apply insights from the relevant modules
4. Provide one clear micro-action when appropriate
5. Offer XP for meaningful actions

IMPORTANT RULES:
- Be warm, clear, and concise
- Use the user's actual data from Notion when relevant
- Never overwhelm - one thing at a time
- If they seem stressed, shift to Calming Guide mode
- If they accomplished something, celebrate it
- Keep responses focused and conversational
- Use bullet points sparingly, prefer natural prose
- You can reference their specific tasks, deals, and contacts by name

ACTIONS YOU CAN TAKE (when the user asks):
- Create tasks (tell them you've created it)
- Reference their specific deals, tasks, contacts
- Provide follow-up message templates
- Give meeting prep based on their actual data
- Award XP for accomplishments

## RESPONSE FORMAT FOR CHOICES

When you present the user with options or choices, you MUST end your response with a JSON block in this exact format:

\`\`\`options
{
  "hasOptions": true,
  "options": [
    {"id": "1", "label": "Short label for option 1", "value": "Full description of what happens if they choose option 1"},
    {"id": "2", "label": "Short label for option 2", "value": "Full description of what happens if they choose option 2"},
    {"id": "3", "label": "Short label for option 3", "value": "Full description of what happens if they choose option 3"}
  ]
}
\`\`\`

RULES FOR OPTIONS:
- Only include the options block when you're presenting clear choices to the user
- Keep labels SHORT (2-5 words max) - these become buttons
- The "value" is what the user is choosing (will be sent as their response)
- Maximum 4 options
- Don't include options for simple yes/no questions - just use:
\`\`\`options
{"hasOptions": true, "options": [{"id": "yes", "label": "Yes, please", "value": "Yes, please do that"}, {"id": "no", "label": "No thanks", "value": "No, that's okay for now"}]}
\`\`\`

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;

    // Build conversation for OpenAI
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    let response = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response. Please try again.';
    
    // Parse options from response
    let options: Array<{id: string; label: string; value: string}> | null = null;
    
    const optionsMatch = response.match(/```options\s*([\s\S]*?)\s*```/);
    if (optionsMatch) {
      try {
        const optionsData = JSON.parse(optionsMatch[1]);
        if (optionsData.hasOptions && optionsData.options) {
          options = optionsData.options;
        }
        // Remove the options block from the response
        response = response.replace(/```options\s*[\s\S]*?\s*```/, '').trim();
      } catch (e) {
        console.error('Failed to parse options:', e);
      }
    }

    return NextResponse.json({
      response,
      options,
      modulesUsed: relevantModules,
    });
  } catch (error) {
    console.error('Pulse Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: String(error) },
      { status: 500 }
    );
  }
}
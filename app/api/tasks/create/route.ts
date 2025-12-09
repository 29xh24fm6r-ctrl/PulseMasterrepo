import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
// app/api/tasks/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import OpenAI from 'openai';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to clean JSON from markdown code blocks
function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export async function POST(request: NextRequest) {
  try {
    const { taskInput, useAI = true } = await request.json();

    if (!taskInput) {
      return NextResponse.json({ error: 'Task input required' }, { status: 400 });
    }

    let taskData = {
      title: taskInput,
      priority: 'Medium',
      dueDate: null as string | null,
      category: 'General',
      status: 'Not Started'
    };

    // 🤖 AI parses natural language into structured task
    if (useAI) {
      const aiPrompt = `Parse this task input into structured data.

Task: "${taskInput}"

Return JSON with:
- title: Clear, actionable title
- priority: High/Medium/Low (urgent/asap/important = High)
- dueDate: ISO date if mentioned (today, tomorrow, next week, friday, etc.) or null
- category: Work/Personal/Sales/Follow-Up/Research/Administrative/General

Today: ${new Date().toISOString()}

IMPORTANT: Return ONLY the raw JSON object. No markdown, no code blocks, no explanation.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: aiPrompt }],
        temperature: 0.3,
      });

      const aiResponse = completion.choices[0].message.content?.trim();
      if (aiResponse) {
        try {
          const cleanedResponse = cleanJsonResponse(aiResponse);
          const parsed = JSON.parse(cleanedResponse);
          taskData = { ...taskData, ...parsed };
        } catch (e) {
          console.error('AI parse failed:', e);
        }
      }
    }

    // Create in Notion
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_TASKS! },
      properties: {
        'Name': { title: [{ text: { content: taskData.title } }] },
        'Status': { select: { name: taskData.status } },
        'Priority': { select: { name: taskData.priority } },
        'Category': { multi_select: [{ name: taskData.category }] },
        ...(taskData.dueDate && {
          'Due Date': { date: { start: taskData.dueDate } }
        })
      }
    });

    return NextResponse.json({
      success: true,
      taskId: response.id,
      task: taskData,
      aiEnhanced: useAI
    });

  } catch (error: any) {
    console.error('Task creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create task', details: error.message },
      { status: 500 }
    );
  }
}
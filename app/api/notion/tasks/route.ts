// app/api/notion/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const TASKS_DB = process.env.NOTION_DATABASE_TASKS;

export async function GET(request: NextRequest) {
  try {
    if (!TASKS_DB) {
      return NextResponse.json({ ok: false, error: 'TASKS_DB not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'today', 'overdue', 'all'
    const limit = parseInt(searchParams.get('limit') || '10');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Query all non-done tasks - we'll filter in code to avoid Notion property type issues
    const response = await notion.databases.query({
      database_id: TASKS_DB.replace(/-/g, ''),
      page_size: 100,
    });

    let tasks = response.results.map((page: any) => {
      const props = page.properties || {};
      const name = props.Name?.title?.[0]?.plain_text || 'Untitled';
      const status = props.Status?.select?.name || props.Status?.status?.name || 'Pending';
      const priority = props.Priority?.select?.name || 'Medium';
      const dueDate = props['Due Date']?.date?.start || null;
      const category = props.Category?.multi_select?.map((c: any) => c.name) || [];

      return {
        id: page.id,
        name,
        title: name,
        status,
        priority,
        dueDate,
        due: dueDate,
        category,
        isOverdue: dueDate ? dueDate < todayStr && status !== 'Done' : false,
        isDueToday: dueDate === todayStr,
        isDueTomorrow: dueDate === tomorrowStr,
      };
    });

    // Filter out completed tasks
    tasks = tasks.filter(t => 
      t.status !== 'Done' && 
      t.status !== 'Completed' && 
      t.status !== 'Cancelled'
    );

    // Apply filter
    if (filter === 'today') {
      tasks = tasks.filter(t => t.isDueToday || t.isOverdue);
    } else if (filter === 'overdue') {
      tasks = tasks.filter(t => t.isOverdue);
    } else if (filter === 'tomorrow') {
      tasks = tasks.filter(t => t.isDueTomorrow);
    }

    // Sort by priority then due date
    const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    tasks.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (pDiff !== 0) return pDiff;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    // Apply limit
    tasks = tasks.slice(0, limit);

    return NextResponse.json({
      ok: true,
      tasks,
      results: tasks, // Alias for compatibility
      count: tasks.length,
    });

  } catch (error: any) {
    console.error('Tasks API error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
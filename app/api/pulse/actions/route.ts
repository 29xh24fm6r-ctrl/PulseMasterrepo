import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Database IDs from environment
const TASKS_DB = process.env.NOTION_DATABASE_TASKS;
const HABITS_DB = process.env.NOTION_DATABASE_HABITS;
const DEALS_DB = process.env.NOTION_DATABASE_DEALS;
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;
const FOLLOW_UPS_DB = process.env.NOTION_DATABASE_FOLLOW_UPS;

export async function POST(request: Request) {
  try {
    const { action, args } = await request.json();
    
    console.log('Executing action:', action, args);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (action) {
      // ============================================
      // CREATE TASK
      // ============================================
      case 'create_task': {
        if (!TASKS_DB) {
          return NextResponse.json({ success: false, error: 'Tasks database not configured' });
        }
        
        const properties: any = {
          Name: { title: [{ text: { content: args.title || args.task_name || 'New Task' } }] },
          Status: { select: { name: 'Not Started' } },
        };
        
        if (args.priority) {
          properties.Priority = { select: { name: args.priority } };
        }
        
        if (args.due_date) {
          properties['Due Date'] = { date: { start: args.due_date } };
        }
        
        await notion.pages.create({
          parent: { database_id: TASKS_DB },
          properties,
        });
        
        return NextResponse.json({ 
          success: true, 
          message: `Created task: ${args.title || args.task_name}`,
          task: args.title || args.task_name
        });
      }
      
      // ============================================
      // COMPLETE TASK
      // ============================================
      case 'complete_task': {
        if (!TASKS_DB) {
          return NextResponse.json({ success: false, error: 'Tasks database not configured' });
        }
        
        const searchTerm = args.task_name || args.task_search || '';
        
        const searchResponse = await notion.databases.query({
          database_id: TASKS_DB,
          filter: {
            and: [
              { property: 'Name', title: { contains: searchTerm } },
              { property: 'Status', select: { does_not_equal: 'Done' } }
            ]
          },
          page_size: 1
        });
        
        if (searchResponse.results.length === 0) {
          return NextResponse.json({ success: false, error: `No task found matching "${searchTerm}"` });
        }
        
        const task = searchResponse.results[0] as any;
        const taskName = task.properties.Name?.title?.[0]?.text?.content || searchTerm;
        
        await notion.pages.update({
          page_id: task.id,
          properties: { Status: { select: { name: 'Done' } } }
        });
        
        return NextResponse.json({ success: true, message: `Completed: ${taskName}`, task: taskName });
      }
      
      // ============================================
      // LOG HABIT
      // ============================================
      case 'log_habit': {
        if (!HABITS_DB) {
          return NextResponse.json({ success: false, error: 'Habits database not configured' });
        }
        
        const habitSearch = args.habit_name || args.habit_search || '';
        
        const searchResponse = await notion.databases.query({
          database_id: HABITS_DB,
          filter: { property: 'Name', title: { contains: habitSearch } },
          page_size: 1
        });
        
        if (searchResponse.results.length === 0) {
          return NextResponse.json({ success: false, error: `No habit found matching "${habitSearch}"` });
        }
        
        const habit = searchResponse.results[0] as any;
        const habitName = habit.properties.Name?.title?.[0]?.text?.content || habitSearch;
        const currentStreak = habit.properties.Streak?.number || 0;
        
        await notion.pages.update({
          page_id: habit.id,
          properties: {
            'Last Completed': { date: { start: todayStr } },
            'Streak': { number: currentStreak + 1 }
          }
        });
        
        return NextResponse.json({ 
          success: true, 
          message: `Logged ${habitName} - ${currentStreak + 1} day streak!`,
          habit: habitName,
          streak: currentStreak + 1
        });
      }
      
      // ============================================
      // GET TASKS
      // ============================================
      case 'get_tasks': {
        if (!TASKS_DB) {
          return NextResponse.json({ success: false, error: 'Tasks database not configured' });
        }
        
        let filter: any = { property: 'Status', select: { does_not_equal: 'Done' } };
        
        if (args.filter === 'today') {
          filter = {
            and: [
              { property: 'Due Date', date: { equals: todayStr } },
              { property: 'Status', select: { does_not_equal: 'Done' } }
            ]
          };
        } else if (args.filter === 'overdue') {
          filter = {
            and: [
              { property: 'Due Date', date: { before: todayStr } },
              { property: 'Status', select: { does_not_equal: 'Done' } }
            ]
          };
        }
        
        const response = await notion.databases.query({
          database_id: TASKS_DB,
          filter,
          page_size: 10
        });
        
        const tasks = response.results.map((page: any) => ({
          name: page.properties.Name?.title?.[0]?.text?.content || 'Untitled',
          priority: page.properties.Priority?.select?.name || 'Medium',
          due_date: page.properties['Due Date']?.date?.start || null,
        }));
        
        return NextResponse.json({ 
          success: true, 
          count: tasks.length,
          tasks 
        });
      }
      
      // ============================================
      // GET DEAL INFO
      // ============================================
      case 'get_deal_info': {
        if (!DEALS_DB) {
          return NextResponse.json({ success: false, error: 'Deals database not configured' });
        }
        
        const dealSearch = args.search || args.deal_search || '';
        
        const response = await notion.databases.query({
          database_id: DEALS_DB,
          filter: {
            or: [
              { property: 'Name', title: { contains: dealSearch } },
              { property: 'Company', rich_text: { contains: dealSearch } }
            ]
          },
          page_size: 3
        });
        
        if (response.results.length === 0) {
          return NextResponse.json({ success: false, error: `No deals found matching "${dealSearch}"` });
        }
        
        const deals = response.results.map((page: any) => ({
          name: page.properties.Name?.title?.[0]?.text?.content || 'Untitled',
          company: page.properties.Company?.rich_text?.[0]?.text?.content || '',
          stage: page.properties.Stage?.select?.name || 'Unknown',
          value: page.properties.Value?.number || 0,
        }));
        
        return NextResponse.json({ success: true, deals });
      }
      
      // ============================================
      // NAVIGATE
      // ============================================
      case 'navigate': {
        const routes: Record<string, string> = {
          'journal': '/journal',
          'tasks': '/tasks',
          'deals': '/deals',
          'habits': '/habits',
          'contacts': '/second-brain',
          'dashboard': '/',
          'morning-brief': '/morning-brief',
          'follow-ups': '/follow-ups',
        };
        
        const url = routes[args.page] || '/';
        
        return NextResponse.json({ 
          success: true, 
          navigate: url,
          message: `Opening ${args.page}`
        });
      }
      
      // ============================================
      // GET HABITS STATUS
      // ============================================
      case 'get_habits_status':
      case 'get_habits': {
        if (!HABITS_DB) {
          return NextResponse.json({ success: false, error: 'Habits database not configured' });
        }
        
        const response = await notion.databases.query({
          database_id: HABITS_DB,
          page_size: 10
        });
        
        const habits = response.results.map((page: any) => {
          const lastCompleted = page.properties['Last Completed']?.date?.start;
          return {
            name: page.properties.Name?.title?.[0]?.text?.content || 'Untitled',
            streak: page.properties.Streak?.number || 0,
            completed_today: lastCompleted === todayStr
          };
        });
        
        return NextResponse.json({ 
          success: true, 
          total: habits.length,
          completed_today: habits.filter(h => h.completed_today).length,
          habits 
        });
      }
      
      // ============================================
      // CREATE FOLLOW UP
      // ============================================
      case 'create_follow_up': {
        if (!FOLLOW_UPS_DB) {
          return NextResponse.json({ success: false, error: 'Follow-ups database not configured' });
        }
        
        const properties: any = {
          Name: { title: [{ text: { content: `Follow up with ${args.person_name}: ${args.reason}` } }] },
          Status: { select: { name: 'Pending' } },
        };
        
        if (args.due_date) {
          properties['Due Date'] = { date: { start: args.due_date } };
        }
        
        await notion.pages.create({
          parent: { database_id: FOLLOW_UPS_DB },
          properties,
        });
        
        return NextResponse.json({ 
          success: true, 
          message: `Created follow-up for ${args.person_name}`
        });
      }
      
      // ============================================
      // DEFAULT
      // ============================================
      default:
        console.log('Unknown action:', action);
        return NextResponse.json({ 
          success: false, 
          error: `Unknown action: ${action}` 
        });
    }
    
  } catch (error) {
    console.error('Action execution error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
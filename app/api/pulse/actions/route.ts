import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { createTask, completeTask, getTasks, Task } from '@/lib/data/tasks';
import { getHabits, logHabitCompletion } from '@/lib/data/habits';
import { getDeals } from '@/lib/data/deals';
import { createFollowUp } from '@/lib/data/followups';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { action, args } = await request.json();

    console.log('Executing action:', action, args);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (action) {
      // ============================================
      // CREATE TASK
      // ============================================
      case 'create_task': {
        const task = await createTask(userId, {
          title: args.title || args.task_name || 'New Task',
          status: 'pending',
          priority: args.priority || 'Medium',
          due_at: args.due_date,
          description: args.description
        });

        return NextResponse.json({
          success: true,
          message: `Created task: ${task.title}`,
          task: task.title
        });
      }

      // ============================================
      // COMPLETE TASK (Search by name)
      // ============================================
      case 'complete_task': {
        const searchTerm = (args.task_name || args.task_search || '').toLowerCase();
        if (!searchTerm) {
          return NextResponse.json({ success: false, error: "Task name required" });
        }

        const tasks = await getTasks(userId);
        const match = tasks.find(t => t.title.toLowerCase().includes(searchTerm) && t.status !== 'done');

        if (!match) {
          return NextResponse.json({ success: false, error: `No active task found matching "${searchTerm}"` });
        }

        const completed = await completeTask(userId, match.id);

        return NextResponse.json({ success: true, message: `Completed: ${completed.title}`, task: completed.title });
      }

      // ============================================
      // LOG HABIT (Search by name)
      // ============================================
      case 'log_habit': {
        const habitSearch = (args.habit_name || args.habit_search || '').toLowerCase();
        if (!habitSearch) {
          return NextResponse.json({ success: false, error: "Habit name required" });
        }

        const habits = await getHabits(userId);
        const match = habits.find(h => h.name.toLowerCase().includes(habitSearch));

        if (!match) {
          return NextResponse.json({ success: false, error: `No habit found matching "${habitSearch}"` });
        }

        // Default XP 15 if not set
        const updated = await logHabitCompletion(userId, match.id, match.xp_reward || 15);

        return NextResponse.json({
          success: true,
          message: `Logged ${match.name} - ${updated.streak} day streak!`,
          habit: match.name,
          streak: updated.streak
        });
      }

      // ============================================
      // GET TASKS
      // ============================================
      case 'get_tasks': {
        const tasks = await getTasks(userId);
        let filtered = tasks.filter(t => t.status !== 'done');

        if (args.filter === 'today') {
          filtered = filtered.filter(t => t.due_at && t.due_at.startsWith(todayStr));
        } else if (args.filter === 'overdue') {
          filtered = filtered.filter(t => t.due_at && t.due_at < todayStr);
        }

        return NextResponse.json({
          success: true,
          count: filtered.length,
          tasks: filtered.map(t => ({
            name: t.title,
            priority: t.priority,
            due_date: t.due_at
          }))
        });
      }

      // ============================================
      // GET DEAL INFO
      // ============================================
      case 'get_deal_info': {
        const dealSearch = (args.search || args.deal_search || '').toLowerCase();
        const deals = await getDeals(userId);

        const filtered = deals.filter(d =>
          d.title.toLowerCase().includes(dealSearch) ||
          (d.company && d.company.toLowerCase().includes(dealSearch))
        ).slice(0, 3);

        if (filtered.length === 0) {
          return NextResponse.json({ success: false, error: `No deals found matching "${dealSearch}"` });
        }

        return NextResponse.json({
          success: true, deals: filtered.map(d => ({
            name: d.title,
            company: d.company,
            stage: d.stage,
            value: d.value
          }))
        });
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
        const habits = await getHabits(userId);

        const habitStatuses = habits.map(h => {
          // Check if completed today using last_completed_at
          const completedToday = h.last_completed_at ? h.last_completed_at.startsWith(todayStr) : false;
          return {
            name: h.name,
            streak: h.streak,
            completed_today: completedToday
          };
        });

        return NextResponse.json({
          success: true,
          total: habits.length,
          completed_today: habitStatuses.filter(h => h.completed_today).length,
          habits: habitStatuses
        });
      }

      // ============================================
      // CREATE FOLLOW UP
      // ============================================
      case 'create_follow_up': {
        await createFollowUp(userId, {
          name: `Follow up with ${args.person_name}: ${args.reason}`,
          status: 'pending',
          due_date: args.due_date,
          priority: 'Medium',
          type: 'general',
          person_name: args.person_name
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
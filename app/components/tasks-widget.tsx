"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Clock,
  AlertTriangle,
  Calendar,
  Zap,
} from "lucide-react";

interface Task {
  id: string;
  name: string;
  status: string;
  priority: "High" | "Medium" | "Low";
  dueDate: string | null;
  completed: boolean;
}

interface TasksWidgetData {
  tasks: Task[];
  stats: {
    total: number;
    completed: number;
    overdue: number;
    dueToday: number;
  };
}

export function TasksWidget() {
  const [data, setData] = useState<TasksWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const res = await fetch("/api/tasks/pull");
      const result = await res.json();

      if (result.ok && result.tasks) {
        const processedData = processTasks(result.tasks);
        setData(processedData);
      } else {
        setData(getMockData());
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  }

  function processTasks(rawTasks: any[]): TasksWidgetData {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks: Task[] = rawTasks.map((t: any) => ({
      id: t.id || Math.random().toString(),
      name: t.name || t.Name || "Task",
      status: t.status || t.Status || "Not Started",
      priority: t.priority || t.Priority || "Medium",
      dueDate: t.dueDate || t.DueDate || null,
      completed: t.status === "Done" || t.Status === "Done",
    }));

    // Filter to show: incomplete tasks, prioritize by due date and priority
    const incompleteTasks = tasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        // Priority order: High > Medium > Low
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by due date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      })
      .slice(0, 5);

    // Calculate stats
    let overdue = 0;
    let dueToday = 0;
    
    for (const task of tasks) {
      if (task.completed) continue;
      if (task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due < today) overdue++;
        else if (due.getTime() === today.getTime()) dueToday++;
      }
    }

    return {
      tasks: incompleteTasks,
      stats: {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        overdue,
        dueToday,
      },
    };
  }

  function getMockData(): TasksWidgetData {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return {
      tasks: [
        { id: "1", name: "Review Q4 pipeline", status: "Not Started", priority: "High", dueDate: today, completed: false },
        { id: "2", name: "Follow up with Acme Corp", status: "Not Started", priority: "High", dueDate: yesterday, completed: false },
        { id: "3", name: "Prepare demo slides", status: "In Progress", priority: "Medium", dueDate: tomorrow, completed: false },
        { id: "4", name: "Update CRM notes", status: "Not Started", priority: "Low", dueDate: null, completed: false },
      ],
      stats: {
        total: 12,
        completed: 8,
        overdue: 1,
        dueToday: 2,
      },
    };
  }

  async function toggleTask(taskId: string) {
    if (!data) return;

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        ),
        stats: {
          ...prev.stats,
          completed: prev.stats.completed + 1,
        },
      };
    });

    // Call API
    try {
      await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case "High": return "text-red-400";
      case "Medium": return "text-amber-400";
      case "Low": return "text-zinc-400";
      default: return "text-zinc-400";
    }
  }

  function getPriorityDot(priority: string): string {
    switch (priority) {
      case "High": return "bg-red-400";
      case "Medium": return "bg-amber-400";
      case "Low": return "bg-zinc-500";
      default: return "bg-zinc-500";
    }
  }

  function getDueStatus(dueDate: string | null): { label: string; color: string; icon: any } | null {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: "Overdue", color: "text-red-400 bg-red-500/20", icon: AlertTriangle };
    } else if (diffDays === 0) {
      return { label: "Today", color: "text-amber-400 bg-amber-500/20", icon: Clock };
    } else if (diffDays === 1) {
      return { label: "Tomorrow", color: "text-blue-400 bg-blue-500/20", icon: Calendar };
    }
    return null;
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center gap-2 text-zinc-400 mb-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Tasks</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const completionRate = data.stats.total > 0 
    ? Math.round((data.stats.completed / data.stats.total) * 100) 
    : 0;

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 relative overflow-hidden">
      {/* Alert glow for overdue */}
      {data.stats.overdue > 0 && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-3xl" />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-blue-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Tasks</span>
          </div>
          <Link
            href="/tasks"
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-white font-medium">{data.stats.completed}/{data.stats.total}</span>
            <span className="text-zinc-500">done</span>
          </div>
          {data.stats.overdue > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{data.stats.overdue}</span>
              <span>overdue</span>
            </div>
          )}
          {data.stats.dueToday > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-amber-400">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{data.stats.dueToday}</span>
              <span>today</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {data.tasks.length === 0 ? (
            <div className="text-center py-4 text-zinc-500 text-sm">
              🎉 All caught up!
            </div>
          ) : (
            data.tasks.map((task) => {
              const dueStatus = getDueStatus(task.dueDate);
              const DueIcon = dueStatus?.icon;

              return (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                    ${task.completed
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : dueStatus?.label === "Overdue"
                      ? "bg-red-500/5 border border-red-500/20 hover:border-red-500/40"
                      : "bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600"
                    }
                  `}
                >
                  {/* Checkbox */}
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                    ${task.completed
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-zinc-600"
                    }
                  `}>
                    {task.completed && <CheckCircle2 className="w-3 h-3" />}
                  </div>

                  {/* Priority Dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityDot(task.priority)}`} />

                  {/* Task Name */}
                  <span className={`flex-1 text-sm truncate ${task.completed ? "text-emerald-400 line-through" : "text-zinc-200"}`}>
                    {task.name}
                  </span>

                  {/* Due Badge */}
                  {dueStatus && !task.completed && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${dueStatus.color}`}>
                      {DueIcon && <DueIcon className="w-3 h-3" />}
                      {dueStatus.label}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Quick Add Link */}
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <Link
            href="/tasks"
            className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Add or manage tasks
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TasksWidget;

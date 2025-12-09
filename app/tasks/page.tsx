"use client";
import { TasksVoice } from "@/components/PageVoiceComponents";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Circle, ArrowLeft, Plus } from "lucide-react";
import { useXPToast } from "../components/xp-toast";

type Task = {
  id: string;
  name: string;
  status: string;
  priority: string;
  dueDate: string | null;
  category?: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [completing, setCompleting] = useState<string | null>(null);
  const { showXPToast } = useXPToast();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks/pull");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function completeTask(taskId: string) {
    setCompleting(taskId);
    
    // Get task info before completing (for toast)
    const task = tasks.find(t => t.id === taskId);
    const isHighPriority = task?.priority === 'High' || task?.priority === '🔴 High';
    
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Update local state
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: "Done" } : t
        ));
        
        // 🎉 Show XP Toast!
        if (data.xp) {
          showXPToast({
            amount: data.xp.amount || (isHighPriority ? 40 : 25),
            category: data.xp.category || "DXP",
            activity: `Completed: ${task?.name || 'Task'}`,
            wasCrit: data.xp.wasCrit || false,
            critMultiplier: data.xp.critMultiplier,
          });
        } else {
          // Fallback if API doesn't return XP data
          showXPToast({
            amount: isHighPriority ? 40 : 25,
            category: "DXP",
            activity: `Completed: ${task?.name || 'Task'}`,
            wasCrit: false,
          });
        }
      }
    } catch (err) {
      console.error("Failed to complete task:", err);
    } finally {
      setCompleting(null);
    }
  }

  // Helper functions
  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    const today = new Date();
    const date = new Date(dateStr);
    return date.toDateString() === today.toDateString();
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    return date < today;
  };

  const priorityOrder: Record<string, number> = { 'High': 0, 'Medium': 1, 'Low': 2 };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(t => {
      if (filter === 'active') return t.status !== 'Done' && t.status !== 'Completed';
      if (filter === 'completed') return t.status === 'Done' || t.status === 'Completed';
      return true;
    })
    .sort((a, b) => {
      // Completed tasks at bottom
      const aCompleted = a.status === 'Done' || a.status === 'Completed';
      const bCompleted = b.status === 'Done' || b.status === 'Completed';
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
      
      // Then by priority
      const priorityDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  const activeTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'Completed');
  const overdueTasks = activeTasks.filter(t => isOverdue(t.dueDate));
  const dueTodayTasks = activeTasks.filter(t => isToday(t.dueDate));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              📋 Tasks
            </h1>
            <p className="text-slate-400 text-sm">Manage your tasks</p>
          </div>
        </div>
        <TasksVoice />
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">{activeTasks.length}</div>
          <div className="text-xs text-slate-400 uppercase">Active</div>
        </div>
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{overdueTasks.length}</div>
          <div className="text-xs text-red-400 uppercase">Overdue</div>
        </div>
        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{dueTodayTasks.length}</div>
          <div className="text-xs text-yellow-400 uppercase">Due Today</div>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {tasks.filter(t => t.status === 'Done' || t.status === 'Completed').length}
          </div>
          <div className="text-xs text-green-400 uppercase">Completed</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            filter === 'active'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            filter === 'completed'
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            filter === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">📋</div>
            <div className="text-slate-400">Loading tasks...</div>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🎉</div>
          <div className="text-slate-400">
            {filter === 'active' ? 'No active tasks!' : filter === 'completed' ? 'No completed tasks yet' : 'No tasks found'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'Done' || task.status === 'Completed';
            const taskOverdue = isOverdue(task.dueDate) && !isCompleted;
            const taskDueToday = isToday(task.dueDate) && !isCompleted;

            return (
              <div
                key={task.id}
                className={`bg-slate-900/70 border rounded-xl p-4 transition-all ${
                  isCompleted
                    ? 'border-green-500/30 opacity-60'
                    : taskOverdue
                    ? 'border-red-500/50 bg-red-900/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Complete Button */}
                  <button
                    onClick={() => !isCompleted && completeTask(task.id)}
                    disabled={isCompleted || completing === task.id}
                    className={`flex-shrink-0 transition-all ${
                      isCompleted
                        ? 'text-green-500 cursor-default'
                        : 'text-slate-500 hover:text-green-400 hover:scale-110'
                    }`}
                  >
                    {completing === task.id ? (
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {task.dueDate && (
                        <span className={`text-xs ${
                          taskOverdue ? 'text-red-400 font-semibold' : 
                          taskDueToday ? 'text-yellow-400' : 'text-slate-400'
                        }`}>
                          {taskOverdue && '⚠️ '}
                          {new Date(task.dueDate).toLocaleDateString()}
                          {taskDueToday && ' (Today)'}
                        </span>
                      )}
                      {task.category && (
                        <span className="text-xs text-slate-500">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <span className={`text-xs px-3 py-1 rounded-full border flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

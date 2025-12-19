"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  created_at: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title?.toLowerCase().includes(q);
  });

  const tasksByStatus = {
    pending: filteredTasks.filter((t) => t.status === "pending" || !t.status),
    in_progress: filteredTasks.filter((t) => t.status === "in_progress"),
    completed: filteredTasks.filter((t) => t.status === "completed" || t.status === "done"),
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tasks</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage your tasks and to-dos</p>
          </div>
          <Link
            href="/tasks/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-4">
              {searchQuery ? "No tasks found matching your search" : "No tasks yet"}
            </p>
            {!searchQuery && (
              <Link
                href="/tasks/new"
                className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300"
              >
                <Plus className="w-4 h-4" />
                Create your first task
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {/* Pending */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <Circle className="w-4 h-4" />
                Pending ({tasksByStatus.pending.length})
              </h2>
              <div className="space-y-2">
                {tasksByStatus.pending.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* In Progress */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                In Progress ({tasksByStatus.in_progress.length})
              </h2>
              <div className="space-y-2">
                {tasksByStatus.in_progress.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* Completed */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed ({tasksByStatus.completed.length})
              </h2>
              <div className="space-y-2">
                {tasksByStatus.completed.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-violet-600 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-white font-medium flex-1">{task.title}</h3>
        <ArrowRight className="w-4 h-4 text-zinc-500 flex-shrink-0 ml-2" />
      </div>
      {task.due_date && (
        <div className="text-xs text-zinc-400">
          Due: {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}
      {task.priority && (
        <div className="mt-2">
          <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded">
            {task.priority}
          </span>
        </div>
      )}
    </Link>
  );
}

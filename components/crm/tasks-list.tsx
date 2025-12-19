"use client";

import Link from "next/link";
import { Plus, CheckSquare, Calendar } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: number;
  due_at?: string;
  created_at: string;
}

export default function TasksList({ tasks }: { tasks: Task[] }) {
  const getPriorityColor = (priority?: number) => {
    if (!priority) return "text-gray-400";
    if (priority >= 0.7) return "text-red-400";
    if (priority >= 0.5) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Tasks</h1>
          <Link
            href="/people"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Link>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-400 mt-1">{task.description}</div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className={`px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                        {task.status}
                      </span>
                      {task.due_at && (
                        <span className="text-gray-400 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {new Date(task.due_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <CheckSquare className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-12 text-center">
            <CheckSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No tasks yet</h2>
            <p className="text-gray-400 mb-6">Add tasks to track what needs to get done</p>
            <Link
              href="/people"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Add Task
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}


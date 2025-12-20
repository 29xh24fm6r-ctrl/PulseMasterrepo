"use client";

import { CheckSquare, Calendar, AlertCircle } from "lucide-react";
import type { Task } from "@/lib/crm/types";

interface TaskInboxProps {
  tasks: {
    overdue: Task[];
    dueToday: Task[];
    dueSoon: Task[];
  };
}

export default function TaskInbox({ tasks }: TaskInboxProps) {
  const { overdue, dueToday, dueSoon } = tasks;
  const hasAnyTasks = overdue.length > 0 || dueToday.length > 0 || dueSoon.length > 0;

  if (!hasAnyTasks) {
    return (
      <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-8 text-center">
        <CheckSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No tasks due</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 space-y-4">
      {/* Overdue */}
      {overdue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Overdue ({overdue.length})</h3>
          </div>
          <div className="space-y-2">
            {overdue.map((task) => (
              <TaskRow key={task.id} task={task} urgent />
            ))}
          </div>
        </div>
      )}

      {/* Due Today */}
      {dueToday.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold">Due Today ({dueToday.length})</h3>
          </div>
          <div className="space-y-2">
            {dueToday.map((task) => (
              <TaskRow key={task.id} task={task} urgent={false} />
            ))}
          </div>
        </div>
      )}

      {/* Due Soon */}
      {dueSoon.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-400">Due Soon ({dueSoon.length})</h3>
          </div>
          <div className="space-y-2">
            {dueSoon.slice(0, 5).map((task) => (
              <TaskRow key={task.id} task={task} urgent={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, urgent }: { task: Task; urgent: boolean }) {
  const handleComplete = async () => {
    try {
      const response = await fetch(`/api/crm/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  return (
    <div
      className={`p-2 rounded border ${
        urgent
          ? "border-red-500/30 bg-red-500/10"
          : "border-zinc-700 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={handleComplete}
          className="mt-0.5 p-1 hover:bg-zinc-700 rounded transition-colors"
          title="Complete task"
        >
          <CheckSquare className="w-4 h-4 text-gray-400 hover:text-green-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{task.title}</div>
          {task.due_at && (
            <div className="text-xs text-gray-500 mt-1">
              {new Date(task.due_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


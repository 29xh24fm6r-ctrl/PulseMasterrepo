"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/premium/PageHeader";
import { GlassCard } from "@/components/ui/premium/GlassCard";
import { CheckCircle2, Circle, Clock, Tag } from "lucide-react";
import { AnimatePresence } from "framer-motion";

// Mock Data for Task Intelligence
const MOCK_TASKS = [
  { id: "1", title: "Review Q1 strategy document", status: "open", priority: "High", tag: "Strategy" },
  { id: "2", title: "Email follow-up with Nexus Ventures", status: "open", priority: "Medium", tag: "CRM" },
  { id: "3", title: "Update system architecture diagram", status: "done", priority: "Low", tag: "Dev" },
  { id: "4", title: "Prepare weekly keynote presentation", status: "open", priority: "High", tag: "Growth" },
  { id: "5", title: "Schedule mentoring session", status: "open", priority: "Medium", tag: "Team" }
];

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  // We'll keep local state for now, mocking the toggle
  const [tasks, setTasks] = useState(MOCK_TASKS);

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === "open" ? "done" : "open" } : t
    ));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-violet-500/30 pb-20">
      <PageHeader
        title="Task Intelligence"
        subtitle="Orchestrate your mission-critical objectives."
        searchPlaceholder="Search tasks..."
        onSearch={setSearchQuery}
        onAdd={() => console.log("Add task")}
        actionLabel="New Task"
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-300">Active Missions</h2>
          <span className="text-xs text-zinc-500">{filteredTasks.filter(t => t.status === 'open').length} Remaining</span>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <GlassCard key={task.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`transition-colors ${task.status === 'done' ? 'text-emerald-500' : 'text-zinc-600 hover:text-violet-400'}`}
                  >
                    {task.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  <div>
                    <h3 className={`font-medium transition-all ${task.status === 'done' ? 'text-zinc-600 line-through' : 'text-white'}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                      <span className={`px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)} bg-opacity-10 text-white`}>
                        {task.priority}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {task.tag}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Today
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </AnimatePresence>
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <p>No tasks found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'High': return 'bg-red-500 text-red-200';
    case 'Medium': return 'bg-amber-500 text-amber-200';
    case 'Low': return 'bg-blue-500 text-blue-200';
    default: return 'bg-zinc-500';
  }
}

"use client";

import React, { useState } from "react";
import { Mail, CheckSquare, Loader2, Zap, Brain } from "lucide-react";
import { useAutonomy } from "@/lib/use-autonomy";
import { useActionGate } from "./action-gate";
import { useXPToast } from "./xp-toast";

/**
 * Example component showing autonomy-aware behavior
 * This demonstrates how Pulse can auto-create tasks based on autonomy settings
 */

type ExtractedTask = {
  id: string;
  title: string;
  source: string;
  priority: "High" | "Medium" | "Low";
  dueDate?: string;
};

export function AutonomyAwareTaskCreator() {
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const { settings, canAutoExecute, canSuggest } = useAutonomy();
  const { checkAndExecute } = useActionGate();
  const { showXPToast } = useXPToast();

  // Simulate scanning emails and finding tasks
  const scanEmails = async () => {
    setProcessing(true);
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    const mockTasks: ExtractedTask[] = [
      { id: "1", title: "Review Q4 budget proposal", source: "CFO email", priority: "High", dueDate: "2024-12-02" },
      { id: "2", title: "Schedule client call with Acme Corp", source: "Sales thread", priority: "Medium" },
      { id: "3", title: "Send updated contract to legal", source: "Deal discussion", priority: "High", dueDate: "2024-12-01" },
    ];
    
    setExtractedTasks(mockTasks);
    setProcessing(false);

    // Based on autonomy level, handle the tasks differently
    if (canAutoExecute("email", false)) {
      // Jarvis mode: Auto-create all tasks
      for (const task of mockTasks) {
        await createTask(task, true);
      }
      
      showXPToast({
        amount: mockTasks.length * 10,
        category: "DXP",
        activity: `Auto-created ${mockTasks.length} tasks from email`,
        wasCrit: false,
      });
    } else if (canSuggest("email")) {
      // Copilot/Advisor: Show suggestions
      // Tasks are already in state, user can approve individually
    }
    // Zen mode: Just show what was found, no auto-action
  };

  const createTask = async (task: ExtractedTask, silent = false) => {
    // In real app, this would call your task creation API
    console.log("Creating task:", task);
    
    if (!silent) {
      showXPToast({
        amount: 10,
        category: "DXP",
        activity: `Created: ${task.title}`,
        wasCrit: false,
      });
    }
    
    // Remove from suggestions
    setExtractedTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const handleCreateTask = async (task: ExtractedTask) => {
    // Use action gate - will auto-execute or show confirmation based on settings
    await checkAndExecute(
      "tasks",
      () => createTask(task),
      {
        title: "Create Task",
        description: `Create task: "${task.title}" from ${task.source}`,
        isHighStakes: false,
      }
    );
  };

  const handleCreateAllTasks = async () => {
    const isHighStakes = extractedTasks.length > 5; // Consider "bulk" actions high-stakes
    
    await checkAndExecute(
      "tasks",
      async () => {
        for (const task of extractedTasks) {
          await createTask(task, true);
        }
        showXPToast({
          amount: extractedTasks.length * 10,
          category: "DXP",
          activity: `Created ${extractedTasks.length} tasks`,
          wasCrit: false,
        });
        setExtractedTasks([]);
      },
      {
        title: "Create All Tasks",
        description: `Create ${extractedTasks.length} tasks from email scan`,
        isHighStakes,
      }
    );
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Email Task Extractor</h3>
            <p className="text-xs text-slate-400">
              {settings.globalLevel === "jarvis" 
                ? "Tasks will be created automatically" 
                : settings.globalLevel === "copilot"
                ? "You'll approve task creation"
                : settings.globalLevel === "advisor"
                ? "Suggestions only - you decide"
                : "Manual mode - scan to see tasks"
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={scanEmails}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          Scan Emails
        </button>
      </div>

      {/* Autonomy Mode Indicator */}
      <div className="mb-4 px-3 py-2 rounded-lg bg-slate-900/50 flex items-center gap-2">
        <Brain className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-slate-400">
          Current mode: <strong className="text-purple-300">{settings.globalLevel}</strong>
        </span>
      </div>

      {/* Extracted Tasks */}
      {extractedTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {extractedTasks.length} task{extractedTasks.length > 1 ? "s" : ""} found
            </span>
            {extractedTasks.length > 1 && (
              <button
                onClick={handleCreateAllTasks}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Create All
              </button>
            )}
          </div>
          
          {extractedTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <CheckSquare className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm text-white">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    From: {task.source} • {task.priority} priority
                    {task.dueDate && ` • Due: ${task.dueDate}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCreateTask(task)}
                className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 text-sm hover:bg-purple-600/30 transition-colors"
              >
                Create
              </button>
            </div>
          ))}
        </div>
      )}

      {extractedTasks.length === 0 && !processing && (
        <div className="text-center py-8 text-slate-500">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Click "Scan Emails" to find tasks</p>
        </div>
      )}
    </div>
  );
}

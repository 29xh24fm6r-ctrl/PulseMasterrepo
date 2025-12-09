"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Clock, CheckCircle2 } from "lucide-react";

interface TimeBlock {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  completed: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  task: "#3b82f6",
  habit: "#f59e0b",
  goal: "#8b5cf6",
  focus: "#ef4444",
  meeting: "#06b6d4",
  break: "#10b981",
  personal: "#ec4899",
};

export function PlannerWidget() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayPlan();
  }, []);

  function loadTodayPlan() {
    const dateStr = new Date().toISOString().split("T")[0];
    const saved = localStorage.getItem(`planner_${dateStr}`);
    
    if (saved) {
      const plan = JSON.parse(saved);
      setBlocks(plan.blocks || []);
    } else {
      // Sample blocks for demo
      setBlocks([
        { id: "1", title: "Morning Routine", type: "habit", startTime: "06:00", endTime: "07:00", completed: true },
        { id: "2", title: "Deep Work: Q4 Planning", type: "focus", startTime: "08:00", endTime: "10:00", completed: false },
        { id: "3", title: "Team Standup", type: "meeting", startTime: "10:00", endTime: "10:30", completed: false },
        { id: "4", title: "Review Pipeline", type: "task", startTime: "10:30", endTime: "12:00", completed: false },
        { id: "5", title: "Lunch", type: "break", startTime: "12:00", endTime: "13:00", completed: false },
      ]);
    }
    setLoading(false);
  }

  function formatTime(time: string): string {
    const [hour, min] = time.split(":").map(Number);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${min.toString().padStart(2, "0")} ${ampm}`;
  }

  function getCurrentTimePosition(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  // Find current and upcoming blocks
  const currentTime = getCurrentTimePosition();
  const sortedBlocks = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  const currentBlock = sortedBlocks.find((b) => {
    const [startH, startM] = b.startTime.split(":").map(Number);
    const [endH, endM] = b.endTime.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    return currentTime >= startMin && currentTime < endMin;
  });

  const upcomingBlocks = sortedBlocks.filter((b) => {
    const [startH, startM] = b.startTime.split(":").map(Number);
    const startMin = startH * 60 + startM;
    return startMin > currentTime && !b.completed;
  }).slice(0, 3);

  const completedCount = blocks.filter((b) => b.completed).length;

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold">Today's Plan</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold">Today's Plan</h2>
        </div>
        <Link
          href="/planner"
          className="text-xs text-zinc-500 hover:text-cyan-400 flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-800/50 rounded-xl">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-zinc-400">Progress</span>
            <span className="font-medium">
              {completedCount}/{blocks.length}
            </span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{
                width: blocks.length > 0 ? `${(completedCount / blocks.length) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Current Block */}
      {currentBlock && (
        <div className="mb-4">
          <div className="text-xs text-zinc-500 mb-2">NOW</div>
          <div
            className="p-3 rounded-xl border-l-4"
            style={{
              backgroundColor: `${TYPE_COLORS[currentBlock.type]}15`,
              borderColor: TYPE_COLORS[currentBlock.type],
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{currentBlock.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {formatTime(currentBlock.startTime)} - {formatTime(currentBlock.endTime)}
                </div>
              </div>
              {currentBlock.completed && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingBlocks.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 mb-2">UPCOMING</div>
          <div className="space-y-2">
            {upcomingBlocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[block.type] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{block.title}</div>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(block.startTime)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="text-center py-6">
          <Calendar className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No blocks planned</p>
          <Link
            href="/planner"
            className="text-xs text-cyan-400 hover:underline mt-1 inline-block"
          >
            Plan your day →
          </Link>
        </div>
      )}
    </div>
  );
}

export default PlannerWidget;

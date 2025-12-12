// Today Command Queue Component
// app/components/work/TodayCommandQueue.tsx

"use client";

import { useState, useEffect } from "react";
import { WorkItem } from "@/lib/productivity/types";
import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { AppCard } from "@/components/ui/AppCard";
import {
  CheckCircle2,
  Clock,
  Mail,
  Users,
  Briefcase,
  Sparkles,
  MoreVertical,
  Play,
  Bell,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logEFEvent } from "@/lib/productivity/telemetry";

interface TodayCommandQueueProps {
  onItemSelect?: (item: WorkItem) => void;
  onItemComplete?: (itemId: string) => void;
  onItemSnooze?: (itemId: string) => void;
}

export function TodayCommandQueue({
  onItemSelect,
  onItemComplete,
  onItemSnooze,
}: TodayCommandQueueProps) {
  const [queue, setQueue] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await fetch("/api/productivity/today-queue");
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(itemId: string) {
    const item = queue.find((i) => i.id === itemId);
    if (!item) return;

    // Mark as done based on source
    try {
      if (item.source === "task" && item.metadata?.taskId) {
        await fetch(`/api/tasks/${item.metadata.taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
      } else if (item.source === "email_followup" && item.metadata?.followupId) {
        await fetch(`/api/email/followups/${item.metadata.followupId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
      }

      // Log EF event
      if (item.metadata?.isMicroStep) {
        await logEFEvent({
          userId: "", // Will be set by API
          eventType: "micro_step_completed",
          workItemId: itemId,
          parentTaskId: item.metadata.parentTaskId,
          metadata: { stepOrder: item.metadata.stepOrder },
        });
      }

      // Remove from queue
      setQueue(queue.filter((i) => i.id !== itemId));
      onItemComplete?.(itemId);
    } catch (err) {
      console.error("Failed to complete item:", err);
    }
  }

  async function handleSnooze(itemId: string) {
    // For now, just hide it from the queue
    // TODO: Implement proper snooze with timestamp
    setSnoozedIds(new Set([...snoozedIds, itemId]));
    onItemSnooze?.(itemId);
  }

  function getSourceIcon(source: WorkItem["source"]) {
    switch (source) {
      case "task":
        return CheckCircle2;
      case "email_followup":
        return Mail;
      case "relationship_nudge":
        return Users;
      case "deal_nudge":
        return Briefcase;
      case "autopilot_suggestion":
        return Sparkles;
      default:
        return Clock;
    }
  }

  function getSourceBadge(source: WorkItem["source"]) {
    const labels: Record<WorkItem["source"], string> = {
      task: "Task",
      email_followup: "Email",
      relationship_nudge: "Relationship",
      deal_nudge: "Deal",
      calendar: "Calendar",
      autopilot_suggestion: "Autopilot",
    };
    return labels[source] || "Work";
  }

  function getSourceColor(source: WorkItem["source"]) {
    switch (source) {
      case "task":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "email_followup":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "relationship_nudge":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "deal_nudge":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "autopilot_suggestion":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  }

  const visibleQueue = queue.filter((item) => !snoozedIds.has(item.id));

  return (
    <AppCard
      title="Today Command Queue"
      description={`${visibleQueue.length} prioritized actions ready to execute`}
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={loadQueue}
          className="text-xs"
        >
          Refresh
        </Button>
      }
    >
      {loading ? (
        <LoadingState message="Building your command queue…" />
      ) : visibleQueue.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Queue is clear"
          description="All caught up! Check back later or add new tasks."
        />
      ) : (
        <AnimatedList>
          {visibleQueue.map((item, index) => {
            const SourceIcon = getSourceIcon(item.source);
            const score = item.importanceScore * 0.6 + item.urgencyScore * 0.4;

            return (
              <AnimatedListItem key={item.id}>
                <div
                  className={cn(
                    "p-4 rounded-lg border transition-all duration-200",
                    "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:shadow-sm",
                    index === 0 && "bg-violet-500/10 border-violet-500/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border",
                            getSourceColor(item.source)
                          )}
                        >
                          <SourceIcon className="w-3 h-3" />
                          {getSourceBadge(item.source)}
                        </div>
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded text-xs font-medium">
                            Next Action
                          </span>
                        )}
                      </div>
                      <div className="flex items-start gap-2">
                        {item.metadata?.isMicroStep && (
                          <ChevronRight className="w-3 h-3 text-zinc-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-white mb-1">
                            {item.title}
                          </h3>
                          {item.metadata?.parentTaskTitle && (
                            <p className="text-xs text-zinc-500 mb-1">
                              Part of: {item.metadata.parentTaskTitle}
                            </p>
                          )}
                          {item.description && (
                            <p className="text-xs text-zinc-400 mb-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        {item.estimatedMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.estimatedMinutes} min
                          </span>
                        )}
                        {item.dueAt && (
                          <span>
                            Due: {new Date(item.dueAt).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-zinc-600">
                          Score: {Math.round(score)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onItemSelect?.(item)}
                        className="h-8 px-2 text-xs"
                        title="Do now"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSnooze(item.id)}
                        className="h-8 px-2 text-xs"
                        title="Snooze"
                      >
                        <Bell className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleComplete(item.id)}
                        className="h-8 px-2 text-xs text-green-400 hover:text-green-300"
                        title="Mark done"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </AnimatedListItem>
            );
          })}
        </AnimatedList>
      )}
    </AppCard>
  );
}


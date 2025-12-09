"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Sparkles, Target, TrendingUp, Heart, DollarSign,
  AlertTriangle, Loader2, CheckCircle, ChevronRight, Users,
  RefreshCw, CheckCircle2, Coffee, Lightbulb, Mail,
} from "lucide-react";
import { DashboardVoiceWidget } from "@/components/DashboardVoiceWidget";
import { CalendarWidget, HabitsWidget } from "@/components/life-widget";

interface DashboardData {
  stats: { pendingActions: number; todayEvents: number; weeklyGoalProgress: number; currentStreak: number };
  urgentItems: Array<{ id: string; type: string; title: string; description?: string; priority: string; url: string }>;
  activeGoals: Array<{ id: string; title: string; progress: number; target: number; unit: string }>;
  relationshipAlerts: Array<{ id: string; name: string; reason: string; healthScore: number; daysSinceContact: number }>;
  recentInsights: Array<{ id: string; type: string; content: string }>;
  weeklyProgress: { prioritiesCompleted: number; prioritiesTotal: number; goalsCompleted: number; goalsTotal: number; interactionsLogged: number };
}

interface Task { id: string; title: string; status: string; priority?: string; due_date?: string }
interface Deal { id: string; name: string; stage: string; amount?: number; contact_name?: string }
interface FollowUp { id: string; contact_name: string; reason: string; due_date: string; status: string }

export default function PulseHome() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [xpData, setXpData] = useState<{ xp: number; level: number } | null>(null);
  const [oneThingTask, setOneThingTask] = useState<Task | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    if (isLoaded && userId) fetchAllData();
  }, [userId, isLoaded]);

  async function fetchAllData() {
    try {
      const [dashboardRes, tasksRes, dealsRes, followUpsRes, xpRes] = await Promise.all([
        fetch("/api/dashboard/v3"),
        fetch("/api/tasks?status=pending&limit=10"),
        fetch("/api/deals?limit=10"),
        fetch("/api/follow-ups?status=pending&limit=10"),
        fetch("/api/xp"),
      ]);

      if (dashboardRes.ok) setDashboardData(await dashboardRes.json());

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const taskList = data.tasks || [];
        setTasks(taskList.slice(0, 7));
        const weighted = taskList.map((t: any) => {
          let score = t.priority === "critical" ? 10 : t.priority === "high" ? 7 : t.priority === "medium" ? 4 : 1;
          if (t.due_date) {
            const days = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
            if (days <= 0) score += 10;
            else if (days <= 1) score += 7;
            else if (days <= 3) score += 4;
          }
          return { ...t, score };
        }).sort((a: any, b: any) => b.score - a.score);
        if (weighted.length > 0) setOneThingTask(weighted[0]);
      }

      if (dealsRes.ok) {
        const d = await dealsRes.json();
        setDeals((d.deals || []).filter((x: any) => !x.stage?.toLowerCase().includes("closed")).slice(0, 5));
      }

      if (followUpsRes.ok) {
        const d = await followUpsRes.json();
        setFollowUps((d.followUps || d.items || []).slice(0, 5));
      }

      if (xpRes.ok) {
        const d = await xpRes.json();
        setXpData({ xp: d.xp || 0, level: d.level || 1 });
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }

  async function completeTask(id: string) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (oneThingTask?.id === id) setOneThingTask(tasks.find((t) => t.id !== id) || null);
    } catch (e) {
      console.error(e);
    }
  }

  const formatDate = (s: string) => {
    const d = new Date(s);
    const today = new Date();
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tom.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats;
  const level = xpData?.level || 1;
  const xp = xpData?.xp || 0;
  const xpProgress = (xp % 1000) / 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Score/Level/Streak */}
          <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">{getGreeting()}</span>
              <button onClick={refreshData} disabled={refreshing} className="p-1.5 hover:bg-zinc-800 rounded-lg">
                <RefreshCw className={`w-4 h-4 text-zinc-500 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl font-bold">{level}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-amber-500 rounded-full text-xs font-bold">
                  {stats?.currentStreak || 0}🔥
                </div>
              </div>
              <div>
                <div className="text-lg font-bold">Level {level}</div>
                <div className="text-xs text-zinc-400">{xp.toLocaleString()} XP</div>
                <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-zinc-800/50 rounded-lg">
                <div className="text-lg font-bold text-blue-400">{stats?.todayEvents || 0}</div>
                <div className="text-xs text-zinc-500">Events</div>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded-lg">
                <div className="text-lg font-bold text-amber-400">{tasks.length}</div>
                <div className="text-xs text-zinc-500">Tasks</div>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded-lg">
                <div className="text-lg font-bold text-green-400">{stats?.weeklyGoalProgress || 0}%</div>
                <div className="text-xs text-zinc-500">Goals</div>
              </div>
            </div>
          </div>

          {/* One Thing */}
          <div className="lg:col-span-5 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-pink-500/20 border border-violet-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-medium text-violet-400">TODAY'S ONE THING</span>
            </div>
            {oneThingTask ? (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1 line-clamp-2">{oneThingTask.title}</h2>
                  <p className="text-sm text-zinc-400">
                    {oneThingTask.priority === "critical" && "🔴 Critical "}
                    {oneThingTask.priority === "high" && "🟠 High "}
                    {oneThingTask.due_date && `• Due ${formatDate(oneThingTask.due_date)}`}
                  </p>
                </div>
                <button
                  onClick={() => completeTask(oneThingTask.id)}
                  className="shrink-0 ml-4 flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium"
                >
                  <CheckCircle className="w-5 h-5" /> Done
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-lg font-medium">All caught up!</p>
              </div>
            )}
          </div>

          {/* Voice Widget */}
          <div className="lg:col-span-4">
            <DashboardVoiceWidget />
          </div>
        </div>

        {/* URGENT ALERTS */}
        {dashboardData?.urgentItems && dashboardData.urgentItems.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {dashboardData.urgentItems.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border shrink-0 bg-red-500/10 border-red-500/30 hover:border-red-500/50"
              >
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <div className="font-medium text-sm">{item.title}</div>
                  {item.description && <div className="text-xs text-zinc-400">{item.description}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </Link>
            ))}
          </div>
        )}

        {/* TODAY STRIP */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tasks */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">Today's Tasks</h3>
              </div>
              <Link href="/tasks" className="text-xs text-zinc-400 hover:text-white">
                View all →
              </Link>
            </div>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 group"
                  >
                    <button
                      onClick={() => completeTask(task.id)}
                      className="shrink-0 w-5 h-5 rounded-full border-2 border-zinc-600 hover:border-blue-400 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-3 h-3 text-transparent group-hover:text-blue-400" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-xs text-zinc-500">
                        {task.priority && (
                          <span
                            className={
                              task.priority === "critical"
                                ? "text-red-400"
                                : task.priority === "high"
                                ? "text-orange-400"
                                : "text-yellow-400"
                            }
                          >
                            {task.priority}{" "}
                          </span>
                        )}
                        {task.due_date && formatDate(task.due_date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm">No pending tasks!</p>
              </div>
            )}
          </div>

          {/* Calendar */}
          <CalendarWidget />

          {/* Follow-ups */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold">Follow-ups</h3>
              </div>
              <Link href="/follow-ups" className="text-xs text-zinc-400 hover:text-white">
                View all →
              </Link>
            </div>
            {followUps.length > 0 ? (
              <div className="space-y-2">
                {followUps.slice(0, 5).map((fu) => (
                  <Link
                    key={fu.id}
                    href="/follow-ups"
                    className="block p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                          {fu.contact_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{fu.contact_name}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[150px]">{fu.reason}</div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400">{formatDate(fu.due_date)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="text-sm">No follow-ups scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* WORK SNAPSHOT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pipeline */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold">Pipeline Snapshot</h3>
              </div>
              <Link href="/work" className="text-xs text-zinc-400 hover:text-white">
                Full pipeline →
              </Link>
            </div>
            {deals.length > 0 ? (
              <div className="space-y-3">
                {deals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{deal.name}</div>
                      <div className="text-xs text-zinc-500">
                        {deal.stage} {deal.contact_name && `• ${deal.contact_name}`}
                      </div>
                    </div>
                    {deal.amount && (
                      <div className="text-green-400 font-bold shrink-0 ml-3">
                        ${(deal.amount / 1000).toFixed(0)}k
                      </div>
                    )}
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">{deals.length}</div>
                    <div className="text-xs text-zinc-500">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">
                      ${(deals.reduce((s, d) => s + (d.amount || 0), 0) / 1000).toFixed(0)}k
                    </div>
                    <div className="text-xs text-zinc-500">Pipeline</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-400">
                      {deals.filter((d) => d.stage?.toLowerCase().includes("closing")).length}
                    </div>
                    <div className="text-xs text-zinc-500">Closing</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="text-sm">No active deals</p>
              </div>
            )}
          </div>

          {/* Relationships */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                <h3 className="font-semibold">Relationship Health</h3>
              </div>
              <Link href="/relationships" className="text-xs text-zinc-400 hover:text-white">
                All contacts →
              </Link>
            </div>
            {dashboardData?.relationshipAlerts && dashboardData.relationshipAlerts.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.relationshipAlerts.slice(0, 4).map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/relationships/${alert.id}`}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-lg font-bold text-pink-400">
                        {alert.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-medium">{alert.name}</div>
                        <div className="text-xs text-zinc-500">{alert.reason}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold ${
                          alert.healthScore < 30
                            ? "text-red-400"
                            : alert.healthScore < 50
                            ? "text-amber-400"
                            : "text-green-400"
                        }`}
                      >
                        {alert.healthScore}%
                      </div>
                      <div className="text-xs text-zinc-500">{alert.daysSinceContact}d ago</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Heart className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm">All relationships healthy! 🎉</p>
              </div>
            )}
          </div>
        </div>

        {/* LIFE SNAPSHOT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HabitsWidget />

          {/* Goals */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">Weekly Goals</h3>
              </div>
              <Link href="/goals" className="text-xs text-zinc-400 hover:text-white">
                All goals →
              </Link>
            </div>
            {dashboardData?.activeGoals && dashboardData.activeGoals.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.activeGoals.slice(0, 4).map((goal) => {
                  const pct = goal.target > 0 ? (goal.progress / goal.target) * 100 : 0;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{goal.title}</span>
                        <span className="text-xs text-zinc-400">
                          {goal.progress}/{goal.target} {goal.unit}
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Target className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="text-sm">No goals set this week</p>
                <Link href="/weekly-plan" className="text-violet-400 text-sm hover:underline">
                  Create weekly plan →
                </Link>
              </div>
            )}
            {dashboardData?.weeklyProgress && (
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-800">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">
                    {dashboardData.weeklyProgress.prioritiesCompleted}/{dashboardData.weeklyProgress.prioritiesTotal}
                  </div>
                  <div className="text-xs text-zinc-500">Priorities</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">
                    {dashboardData.weeklyProgress.goalsCompleted}/{dashboardData.weeklyProgress.goalsTotal}
                  </div>
                  <div className="text-xs text-zinc-500">Goals</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-400">
                    {dashboardData.weeklyProgress.interactionsLogged}
                  </div>
                  <div className="text-xs text-zinc-500">Touches</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INSIGHTS */}
        <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-indigo-300">Pulse Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboardData?.recentInsights && dashboardData.recentInsights.length > 0 ? (
              dashboardData.recentInsights.slice(0, 3).map((i) => (
                <div key={i.id} className="p-4 bg-zinc-900/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-300">{i.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="p-4 bg-zinc-900/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Coffee className="w-5 h-5 text-amber-400 shrink-0" />
                    <p className="text-sm text-zinc-300">{stats?.pendingActions || 0} actions waiting for approval</p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-400 shrink-0" />
                    <p className="text-sm text-zinc-300">
                      You're {stats?.weeklyGoalProgress || 0}% through weekly priorities
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-sm text-zinc-300">
                      <Link href="/email" className="text-violet-400 hover:underline">
                        Check Email Intelligence
                      </Link>{" "}
                      for action items
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

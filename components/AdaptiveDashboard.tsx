"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardConfig {
  widgets: string[];
  style: {
    density: 'sparse' | 'comfortable' | 'dense';
    visualStyle: string;
    theme: string;
  };
  coach: {
    personality: string;
    tone: string;
    pushLevel: number;
    focusAreas: string[];
  };
  gamification: {
    xp: boolean;
    streaks: boolean;
    celebrations: string;
    leaderboards: boolean;
  };
  profile: {
    archetype: string;
    summary: string;
    role: any;
    industry: string;
    lifeContext: any;
    family: any;
    energy: any;
  } | null;
  isDefault: boolean;
}

interface DashboardData {
  tasks: any[];
  deals: any[];
  followUps: any[];
  calendar: any[];
  habits: any[];
  streaks: any;
  xp: any;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AdaptiveDashboard() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    
    // Load config and data in parallel
    const [configRes, dataRes] = await Promise.all([
      fetch("/api/dashboard/config"),
      loadAllData(),
    ]);

    if (configRes.ok) {
      const configData = await configRes.json();
      setConfig(configData);
    }

    setData(dataRes);
    setLoading(false);
  }

  async function loadAllData(): Promise<DashboardData> {
    const [tasks, deals, followUps, calendar] = await Promise.all([
      fetchData("/api/tasks/pull", "tasks"),
      fetchData("/api/deals/pull", "deals"),
      fetchData("/api/follow-ups/pull", "followUps"),
      fetchData("/api/calendar/today", "events"),
    ]);

    return {
      tasks: tasks || [],
      deals: deals || [],
      followUps: followUps || [],
      calendar: calendar || [],
      habits: [],
      streaks: null,
      xp: null,
    };
  }

  async function fetchData(url: string, key: string) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data[key] || [];
      }
    } catch (e) {
      console.error(`Failed to load ${key}`, e);
    }
    return [];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Loading your personalized dashboard...</p>
        </div>
      </div>
    );
  }

  const density = config?.style?.density || 'comfortable';
  const gridCols = (density || "comfortable") === 'sparse' ? 'lg:grid-cols-2' : density === 'dense' ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div className="space-y-6">
      {/* Personalized Greeting */}
      {config?.profile && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2"
        >
          <p className="text-sm text-violet-400">
            {config.profile.archetype && `${config.profile.archetype} • `}
            {greeting}
          </p>
        </motion.div>
      )}

      {/* Widget Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-4`}>
        <AnimatePresence>
          {config?.widgets?.map((widgetId, index) => (
            <motion.div
              key={widgetId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <WidgetRenderer
                widgetId={widgetId}
                data={data}
                config={config}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET RENDERER
// ═══════════════════════════════════════════════════════════════════════════

function WidgetRenderer({ 
  widgetId, 
  data, 
  config 
}: { 
  widgetId: string; 
  data: DashboardData | null;
  config: DashboardConfig;
}) {
  switch (widgetId) {
    case 'guidance_stream':
      return <GuidanceWidget config={config} />;
    case 'attention_needed':
      return <AttentionWidget data={data} />;
    case 'daily_focus':
      return <DailyFocusWidget data={data} />;
    case 'tasks_today':
      return <TasksTodayWidget data={data} />;
    case 'tasks_overdue':
      return <TasksOverdueWidget data={data} />;
    case 'calendar_today':
      return <CalendarWidget data={data} />;
    case 'pipeline_snapshot':
      return <PipelineWidget data={data} />;
    case 'follow_up_radar':
      return <FollowUpWidget data={data} />;
    case 'prospecting_tracker':
      return <ProspectingWidget />;
    case 'stale_deals':
      return <StaleDealsWidget data={data} />;
    case 'waiting_on':
      return <WaitingOnWidget data={data} />;
    case 'family_commitments':
      return <FamilyWidget data={data} />;
    case 'energy_check':
      return <EnergyWidget />;
    case 'self_care':
      return <SelfCareWidget />;
    case 'xp_progress':
      return <XPWidget config={config} />;
    case 'streak_tracker':
      return <StreakWidget config={config} />;
    case 'daily_score':
      return <DailyScoreWidget />;
    case 'habits_today':
      return <HabitsWidget />;
    case 'goals_progress':
      return <GoalsWidget />;
    case 'quick_capture':
      return <QuickCaptureWidget />;
    case 'upcoming_week':
      return <UpcomingWeekWidget data={data} />;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INDIVIDUAL WIDGETS
// ═══════════════════════════════════════════════════════════════════════════

function GuidanceWidget({ config }: { config: DashboardConfig }) {
  const [guidance, setGuidance] = useState<string | null>(null);
  
  useEffect(() => {
    // Generate contextual guidance based on time and profile
    const hour = new Date().getHours();
    const role = config.profile?.role?.type;
    const industry = config.profile?.industry;
    
    let message = "";
    if (hour < 10) {
      message = "Start your day with your most important task. What's the ONE thing that would make today a success?";
    } else if (hour < 12) {
      if (industry?.toLowerCase().includes('mortgage') || industry?.toLowerCase().includes('sales')) {
        message = "Morning is prime prospecting time. Have you reached out to anyone new today?";
      } else {
        message = "You're in peak focus time. Tackle something meaningful before lunch.";
      }
    } else if (hour < 14) {
      message = "Good time for lighter tasks or catch-up. Save deep work for when your energy returns.";
    } else if (hour < 17) {
      message = "Afternoon push! Review what's left and prioritize ruthlessly.";
    } else {
      message = "Time to wind down. What will you finish before shutting down?";
    }
    
    setGuidance(message);
  }, [config]);

  return (
    <WidgetCard 
      title="Pulse Guidance" 
      icon="✨" 
      gradient="from-violet-900/30 to-purple-900/30"
      border="border-violet-500/30"
    >
      <p className="text-zinc-300 text-sm leading-relaxed">{guidance}</p>
      <Link href="/confidant" className="text-xs text-violet-400 hover:text-violet-300 mt-2 inline-block">
        Talk to Pulse →
      </Link>
    </WidgetCard>
  );
}

function AttentionWidget({ data }: { data: DashboardData | null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = data?.tasks.filter(t => {
    if (t.status === 'Done' || t.status === 'Completed') return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < today;
  }).slice(0, 3) || [];

  const staleDeals = data?.deals.filter(d => {
    if (!d.lastContact) return false;
    const daysSince = Math.floor((today.getTime() - new Date(d.lastContact).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= 14;
  }).slice(0, 3) || [];

  const total = overdueTasks.length + staleDeals.length;

  if (total === 0) {
    return (
      <WidgetCard 
        title="Needs Attention" 
        icon="🎉" 
        gradient="from-green-900/30 to-emerald-900/30"
        border="border-green-500/30"
      >
        <p className="text-emerald-400 font-medium">You're all caught up!</p>
        <p className="text-zinc-500 text-sm">Nothing urgent right now</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard 
      title="Needs Attention" 
      icon="🚨" 
      gradient="from-red-900/20 to-rose-900/20"
      border="border-red-500/30"
      large
    >
      <div className="space-y-2">
        {overdueTasks.map(task => (
          <div key={task.id} className="p-2 bg-red-500/10 rounded-lg flex justify-between">
            <span className="text-sm text-white truncate">{task.name}</span>
            <span className="text-xs text-red-400">Overdue</span>
          </div>
        ))}
        {staleDeals.map(deal => (
          <div key={deal.id} className="p-2 bg-amber-500/10 rounded-lg flex justify-between">
            <span className="text-sm text-white truncate">{deal.name}</span>
            <span className="text-xs text-amber-400">Stale deal</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

function DailyFocusWidget({ data }: { data: DashboardData | null }) {
  const highPriorityTask = data?.tasks.find(t => 
    t.priority === 'High' && t.status !== 'Done' && t.status !== 'Completed'
  );

  return (
    <WidgetCard 
      title="Daily Focus" 
      icon="🎯" 
      gradient="from-amber-900/30 to-orange-900/30"
      border="border-amber-500/30"
    >
      {highPriorityTask ? (
        <div>
          <p className="text-white font-medium">{highPriorityTask.name}</p>
          {highPriorityTask.project && (
            <p className="text-xs text-zinc-500">{highPriorityTask.project}</p>
          )}
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">Set your main focus for today</p>
      )}
      <Link href="/tasks" className="text-xs text-amber-400 hover:text-amber-300 mt-2 inline-block">
        View tasks →
      </Link>
    </WidgetCard>
  );
}

function TasksTodayWidget({ data }: { data: DashboardData | null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTasks = data?.tasks.filter(t => {
    if (t.status === 'Done' || t.status === 'Completed') return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= today && due < tomorrow;
  }).slice(0, 5) || [];

  return (
    <WidgetCard 
      title="Due Today" 
      icon="⚡" 
      gradient="from-violet-900/30 to-purple-900/30"
      border="border-violet-500/30"
      count={todayTasks.length}
    >
      {todayTasks.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nothing due today</p>
      ) : (
        <div className="space-y-2">
          {todayTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2">
              <span className="text-violet-400">✓</span>
              <span className="text-sm text-zinc-300 truncate">{task.name}</span>
            </div>
          ))}
        </div>
      )}
      <Link href="/tasks" className="text-xs text-violet-400 hover:text-violet-300 mt-2 inline-block">
        All tasks →
      </Link>
    </WidgetCard>
  );
}

function TasksOverdueWidget({ data }: { data: DashboardData | null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = data?.tasks.filter(t => {
    if (t.status === 'Done' || t.status === 'Completed') return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < today;
  }).slice(0, 4) || [];

  if (overdue.length === 0) return null;

  return (
    <WidgetCard 
      title="Overdue" 
      icon="⚠️" 
      gradient="from-red-900/30 to-rose-900/30"
      border="border-red-500/30"
      count={overdue.length}
    >
      <div className="space-y-2">
        {overdue.map(task => (
          <div key={task.id} className="flex items-center justify-between">
            <span className="text-sm text-zinc-300 truncate">{task.name}</span>
            <span className="text-xs text-red-400">
              {getDaysOverdue(task.dueDate)}d
            </span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

function CalendarWidget({ data }: { data: DashboardData | null }) {
  const events = data?.calendar.slice(0, 4) || [];

  return (
    <WidgetCard 
      title="Today" 
      icon="📅" 
      gradient="from-blue-900/30 to-cyan-900/30"
      border="border-blue-500/30"
    >
      {events.length === 0 ? (
        <p className="text-zinc-500 text-sm">No events today</p>
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <div key={event.id} className="flex items-center justify-between">
              <span className="text-sm text-zinc-300 truncate">{event.title}</span>
              <span className="text-xs text-blue-400">{formatTime(event.start)}</span>
            </div>
          ))}
        </div>
      )}
      <Link href="/planner" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
        View calendar →
      </Link>
    </WidgetCard>
  );
}

function PipelineWidget({ data }: { data: DashboardData | null }) {
  const activeStages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Application', 'Processing', 'Underwriting'];
  const activeDeals = data?.deals.filter(d => activeStages.includes(d.stage)) || [];
  
  const stageGroups = activeDeals.reduce((acc, deal) => {
    acc[deal.stage] = (acc[deal.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <WidgetCard 
      title="Pipeline" 
      icon="💼" 
      gradient="from-green-900/30 to-emerald-900/30"
      border="border-green-500/30"
      large
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-white">{activeDeals.length}</span>
        <span className="text-sm text-green-400">${(totalValue / 1000).toFixed(0)}k</span>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-zinc-800">
        {Object.entries(stageGroups).map(([stage, count], i) => (
          <div 
            key={stage}
            className="bg-gradient-to-r from-green-500 to-emerald-500 opacity-80"
            style={{ width: `${((count as number) / activeDeals.length) * 100}%` }}
          />
        ))}
      </div>
      <Link href="/deals" className="text-xs text-green-400 hover:text-green-300 mt-3 inline-block">
        View all deals →
      </Link>
    </WidgetCard>
  );
}

function FollowUpWidget({ data }: { data: DashboardData | null }) {
  const today = new Date();
  const pending = data?.followUps.filter(f => 
    f.status !== 'done' && f.status !== 'sent' && f.status !== 'responded'
  ).slice(0, 4) || [];

  return (
    <WidgetCard 
      title="Follow-ups" 
      icon="📧" 
      gradient="from-orange-900/30 to-amber-900/30"
      border="border-orange-500/30"
      count={pending.length}
    >
      {pending.length === 0 ? (
        <p className="text-zinc-500 text-sm">No pending follow-ups</p>
      ) : (
        <div className="space-y-2">
          {pending.map(f => (
            <div key={f.id} className="flex items-center justify-between">
              <span className="text-sm text-zinc-300 truncate">{f.personName}</span>
              <span className="text-xs text-orange-400">{f.company}</span>
            </div>
          ))}
        </div>
      )}
      <Link href="/follow-ups" className="text-xs text-orange-400 hover:text-orange-300 mt-2 inline-block">
        All follow-ups →
      </Link>
    </WidgetCard>
  );
}

function ProspectingWidget() {
  return (
    <WidgetCard 
      title="Prospecting" 
      icon="🎯" 
      gradient="from-cyan-900/30 to-teal-900/30"
      border="border-cyan-500/30"
    >
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-xs text-zinc-500">Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-zinc-400">5</div>
          <div className="text-xs text-zinc-500">Goal</div>
        </div>
      </div>
      <Link href="/contacts" className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 inline-block">
        Start prospecting →
      </Link>
    </WidgetCard>
  );
}

function StaleDealsWidget({ data }: { data: DashboardData | null }) {
  const today = new Date();
  const stale = data?.deals.filter(d => {
    if (!d.lastContact) return true;
    const daysSince = Math.floor((today.getTime() - new Date(d.lastContact).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= 14;
  }).slice(0, 3) || [];

  if (stale.length === 0) return null;

  return (
    <WidgetCard 
      title="Deals Going Cold" 
      icon="🥶" 
      gradient="from-blue-900/30 to-indigo-900/30"
      border="border-blue-500/30"
      count={stale.length}
    >
      <div className="space-y-2">
        {stale.map(d => (
          <div key={d.id} className="flex items-center justify-between">
            <span className="text-sm text-zinc-300 truncate">{d.name}</span>
            <span className="text-xs text-blue-400">{getDaysSince(d.lastContact)}d</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

function WaitingOnWidget({ data }: { data: DashboardData | null }) {
  const waiting = data?.followUps.filter(f => f.status === 'sent').slice(0, 3) || [];

  return (
    <WidgetCard 
      title="Waiting On" 
      icon="⏳" 
      gradient="from-yellow-900/30 to-amber-900/30"
      border="border-yellow-500/30"
    >
      {waiting.length === 0 ? (
        <p className="text-zinc-500 text-sm">No pending responses</p>
      ) : (
        <div className="space-y-2">
          {waiting.map(f => (
            <div key={f.id} className="text-sm text-zinc-300">{f.personName}</div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

function FamilyWidget({ data }: { data: DashboardData | null }) {
  return (
    <WidgetCard 
      title="Family & Home" 
      icon="🏠" 
      gradient="from-pink-900/30 to-rose-900/30"
      border="border-pink-500/30"
    >
      <p className="text-zinc-400 text-sm">No family events today</p>
      <Link href="/planner" className="text-xs text-pink-400 hover:text-pink-300 mt-2 inline-block">
        Add family events →
      </Link>
    </WidgetCard>
  );
}

function EnergyWidget() {
  const [energy, setEnergy] = useState<number | null>(null);

  return (
    <WidgetCard 
      title="Energy" 
      icon="⚡" 
      gradient="from-amber-900/30 to-yellow-900/30"
      border="border-amber-500/30"
    >
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            onClick={() => setEnergy(level)}
            className={`w-8 h-8 rounded-full transition-all ${
              energy === level 
                ? 'bg-amber-500 text-white' 
                : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </WidgetCard>
  );
}

function SelfCareWidget() {
  return (
    <WidgetCard 
      title="Self Care" 
      icon="💆" 
      gradient="from-teal-900/30 to-cyan-900/30"
      border="border-teal-500/30"
    >
      <p className="text-zinc-400 text-sm">Remember to take breaks</p>
    </WidgetCard>
  );
}

function XPWidget({ config }: { config: DashboardConfig }) {
  if (!config.gamification.xp) return null;
  
  return (
    <WidgetCard 
      title="XP" 
      icon="⭐" 
      gradient="from-violet-900/30 to-purple-900/30"
      border="border-violet-500/30"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-white">1,250</div>
        <div className="text-xs text-violet-400">Level 5</div>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 w-3/4" />
      </div>
      <Link href="/xp" className="text-xs text-violet-400 hover:text-violet-300 mt-2 inline-block">
        View progress →
      </Link>
    </WidgetCard>
  );
}

function StreakWidget({ config }: { config: DashboardConfig }) {
  if (!config.gamification.streaks) return null;

  return (
    <WidgetCard 
      title="Streaks" 
      icon="🔥" 
      gradient="from-orange-900/30 to-red-900/30"
      border="border-orange-500/30"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-white">7</span>
        <span className="text-sm text-orange-400">days</span>
      </div>
      <Link href="/streaks" className="text-xs text-orange-400 hover:text-orange-300 mt-2 inline-block">
        View streaks →
      </Link>
    </WidgetCard>
  );
}

function DailyScoreWidget() {
  return (
    <WidgetCard 
      title="Daily Score" 
      icon="📊" 
      gradient="from-emerald-900/30 to-green-900/30"
      border="border-emerald-500/30"
    >
      <div className="text-3xl font-bold text-white">85</div>
      <p className="text-xs text-emerald-400">Great day so far!</p>
    </WidgetCard>
  );
}

function HabitsWidget() {
  return (
    <WidgetCard 
      title="Habits" 
      icon="✅" 
      gradient="from-green-900/30 to-emerald-900/30"
      border="border-green-500/30"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-zinc-600" />
          <span className="text-sm text-zinc-300">Morning routine</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-zinc-600" />
          <span className="text-sm text-zinc-300">Exercise</span>
        </div>
      </div>
      <Link href="/habits" className="text-xs text-green-400 hover:text-green-300 mt-2 inline-block">
        All habits →
      </Link>
    </WidgetCard>
  );
}

function GoalsWidget() {
  return (
    <WidgetCard 
      title="Goals" 
      icon="🎯" 
      gradient="from-indigo-900/30 to-violet-900/30"
      border="border-indigo-500/30"
    >
      <p className="text-zinc-400 text-sm">No active goals</p>
      <Link href="/goals" className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
        Set goals →
      </Link>
    </WidgetCard>
  );
}

function QuickCaptureWidget() {
  return (
    <WidgetCard 
      title="Quick Capture" 
      icon="📸" 
      gradient="from-zinc-800/50 to-zinc-900/50"
      border="border-zinc-700"
      full
    >
      <Link 
        href="/pulse-capture"
        className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors"
      >
        <span>Capture a thought, task, or note...</span>
      </Link>
    </WidgetCard>
  );
}

function UpcomingWeekWidget({ data }: { data: DashboardData | null }) {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcoming = data?.tasks.filter(t => {
    if (t.status === 'Done' || t.status === 'Completed') return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due > today && due <= nextWeek;
  }).slice(0, 5) || [];

  return (
    <WidgetCard 
      title="Coming Up" 
      icon="🔮" 
      gradient="from-cyan-900/30 to-teal-900/30"
      border="border-cyan-500/30"
    >
      {upcoming.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nothing scheduled this week</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map(task => (
            <div key={task.id} className="flex items-center justify-between">
              <span className="text-sm text-zinc-300 truncate">{task.name}</span>
              <span className="text-xs text-cyan-400">{getDaysUntil(task.dueDate)}d</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function WidgetCard({ 
  title, 
  icon, 
  gradient, 
  border, 
  children, 
  count,
  large,
  full,
}: { 
  title: string;
  icon: string;
  gradient: string;
  border: string;
  children: ReactNode;
  count?: number;
  large?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${large ? "md:col-span-2" : ""} ${full ? "md:col-span-full" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        {count !== undefined && (
          <span className="text-xs text-zinc-500">{count} items</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

function getDaysOverdue(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const today = new Date();
  return Math.floor((today.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

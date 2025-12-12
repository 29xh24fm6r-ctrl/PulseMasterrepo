"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Zap, 
  TrendingUp, 
  Target, 
  Calendar,
  Brain,
  Heart,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock
} from "lucide-react";
import { PulseCard } from "../ui/PulseCard";

interface DashboardData {
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  xp: number;
  level: number;
  streak: number;
  energy: number;
  focusItems: string[];
  upcomingEvents: Array<{
    id: string;
    title: string;
    time: string;
  }>;
}

export function RevolutionaryDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data - replace with actual API calls
    setTimeout(() => {
      setData({
        tasksCompleted: 8,
        tasksTotal: 12,
        habitsCompleted: 5,
        habitsTotal: 7,
        xp: 2450,
        level: 12,
        streak: 7,
        energy: 0.75,
        focusItems: [
          "Complete project proposal",
          "Follow up with Sarah",
          "Review weekly goals"
        ],
        upcomingEvents: [
          { id: "1", title: "Team Standup", time: "9:00 AM" },
          { id: "2", title: "Client Meeting", time: "2:00 PM" }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const taskProgress = data ? (data.tasksCompleted / data.tasksTotal) * 100 : 0;
  const habitProgress = data ? (data.habitsCompleted / data.habitsTotal) * 100 : 0;

  return (
    <div className="min-h-screen p-6 md:p-8 relative">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-2">
                {getGreeting()}
              </h1>
              <p className="text-xl text-zinc-400">
                Welcome back to your Life OS
              </p>
            </div>
            {data && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="glass-strong rounded-2xl px-6 py-4 border border-violet-500/30 glow-soft"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-violet-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Current Level</p>
                    <p className="text-2xl font-bold gradient-text">{data.level}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.header>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Tasks Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PulseCard hover glow className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="glass rounded-xl p-3">
                    <CheckCircle2 className="w-6 h-6 text-violet-400" />
                  </div>
                  <span className="text-2xl font-bold gradient-text">
                    {data ? `${data.tasksCompleted}/${data.tasksTotal}` : "..."}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Tasks Today</h3>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${taskProgress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                  />
                </div>
              </div>
            </PulseCard>
          </motion.div>

          {/* Habits Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PulseCard hover glow className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="glass rounded-xl p-3">
                    <Award className="w-6 h-6 text-pink-400" />
                  </div>
                  <span className="text-2xl font-bold gradient-text">
                    {data ? `${data.habitsCompleted}/${data.habitsTotal}` : "..."}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Habits</h3>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${habitProgress}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full"
                  />
                </div>
              </div>
            </PulseCard>
          </motion.div>

          {/* XP Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PulseCard hover glow className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="glass rounded-xl p-3">
                    <Zap className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-2xl font-bold gradient-text-cool">
                    {data ? data.xp.toLocaleString() : "..."}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Total XP</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{data ? Math.floor(data.xp * 0.1) : 0} today</span>
                </div>
              </div>
            </PulseCard>
          </motion.div>

          {/* Streak Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <PulseCard hover glow className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="glass rounded-xl p-3">
                    <Heart className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-2xl font-bold gradient-text">
                    {data ? `${data.streak}` : "..."}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Day Streak</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>Keep it going!</span>
                  <span className="text-orange-400">🔥</span>
                </div>
              </div>
            </PulseCard>
          </motion.div>
        </div>

        {/* Focus & Schedule Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Focus Items */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <PulseCard hover className="h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="glass rounded-xl p-2">
                  <Target className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Today's Focus</h2>
              </div>
              <div className="space-y-3">
                {data?.focusItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center gap-3 glass rounded-xl p-4 hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 group-hover:scale-150 transition-transform" />
                    <span className="flex-1 text-zinc-300 group-hover:text-white transition-colors">
                      {item}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                  </motion.div>
                ))}
              </div>
            </PulseCard>
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <PulseCard hover className="h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="glass rounded-xl p-2">
                  <Calendar className="w-5 h-5 text-pink-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Upcoming</h2>
              </div>
              <div className="space-y-3">
                {data?.upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-start gap-3 glass rounded-xl p-4 hover:bg-white/5 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-pink-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{event.title}</p>
                      <p className="text-xs text-zinc-400 mt-1">{event.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </PulseCard>
          </motion.div>
        </div>

        {/* Energy & Insights Row */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Energy Level */}
            <PulseCard hover>
              <div className="flex items-center gap-3 mb-4">
                <div className="glass rounded-xl p-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Energy Level</h2>
              </div>
              <div className="relative">
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.energy * 100}%` }}
                    transition={{ duration: 1.5, delay: 0.8 }}
                    className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 rounded-full"
                  />
                </div>
                <p className="text-sm text-zinc-400 mt-2">
                  {Math.round(data.energy * 100)}% — Ready to tackle your day!
                </p>
              </div>
            </PulseCard>

            {/* Quick Insight */}
            <PulseCard hover>
              <div className="flex items-center gap-3 mb-4">
                <div className="glass rounded-xl p-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-white">AI Insight</h2>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                You're making great progress! Based on your activity patterns, 
                your peak productivity window is between 10 AM - 2 PM. 
                Consider scheduling your most important tasks during this time.
              </p>
            </PulseCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}


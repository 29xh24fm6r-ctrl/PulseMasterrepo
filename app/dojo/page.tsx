"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Swords, Target, Flame, Trophy, Clock, Play, CheckCircle, Lock, Star, Zap, Brain, MessageCircle, Phone, DollarSign, Users, Heart, Shield, Loader2, ArrowRight, BookOpen, Dumbbell, Medal, TrendingUp } from "lucide-react";

const challenges = [
  { id: "cold-call", name: "Cold Call Simulation", description: "Practice cold calling with AI-powered prospects", category: "Sales", difficulty: "intermediate", duration: "10 min", xp: 100, icon: <Phone className="w-6 h-6" />, href: "/roleplay-coach?scenario=cold-call" },
  { id: "objection-handling", name: "Objection Gauntlet", description: "Face rapid-fire objections and practice responses", category: "Sales", difficulty: "advanced", duration: "15 min", xp: 150, icon: <Shield className="w-6 h-6" />, href: "/roleplay-coach?scenario=objections" },
  { id: "negotiation", name: "Negotiation Challenge", description: "Negotiate a complex deal with multiple stakeholders", category: "Sales", difficulty: "master", duration: "20 min", xp: 250, icon: <DollarSign className="w-6 h-6" />, href: "/roleplay-coach?scenario=negotiation" },
  { id: "difficult-conversation", name: "Difficult Conversations", description: "Practice handling tough personal and professional conversations", category: "Communication", difficulty: "intermediate", duration: "10 min", xp: 100, icon: <MessageCircle className="w-6 h-6" />, href: "/roleplay-coach?scenario=difficult" },
  { id: "feedback", name: "Giving Feedback", description: "Learn to deliver constructive feedback effectively", category: "Leadership", difficulty: "beginner", duration: "8 min", xp: 75, icon: <Users className="w-6 h-6" />, href: "/roleplay-coach?scenario=feedback" },
  { id: "interview", name: "Interview Prep", description: "Practice common interview questions and scenarios", category: "Career", difficulty: "intermediate", duration: "15 min", xp: 125, icon: <Target className="w-6 h-6" />, href: "/roleplay-coach?scenario=interview" },
  { id: "pitch", name: "Elevator Pitch", description: "Perfect your 60-second pitch", category: "Communication", difficulty: "beginner", duration: "5 min", xp: 50, icon: <Zap className="w-6 h-6" />, href: "/roleplay-coach?scenario=pitch" },
  { id: "conflict", name: "Conflict Resolution", description: "Navigate workplace conflicts professionally", category: "Leadership", difficulty: "advanced", duration: "15 min", xp: 175, icon: <Heart className="w-6 h-6" />, href: "/roleplay-coach?scenario=conflict" },
];

const skillTracks = [
  { id: "sales", name: "Sales Mastery", level: 3, maxLevel: 10, xp: 450, xpToNext: 500, icon: <DollarSign className="w-5 h-5" /> },
  { id: "communication", name: "Communication", level: 5, maxLevel: 10, xp: 780, xpToNext: 1000, icon: <MessageCircle className="w-5 h-5" /> },
  { id: "leadership", name: "Leadership", level: 2, maxLevel: 10, xp: 250, xpToNext: 300, icon: <Users className="w-5 h-5" /> },
  { id: "negotiation", name: "Negotiation", level: 4, maxLevel: 10, xp: 600, xpToNext: 750, icon: <Shield className="w-5 h-5" /> },
];

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  master: "bg-red-500/20 text-red-400 border-red-500/30",
};

const categoryFilters = ["All", "Sales", "Communication", "Leadership", "Career"];

export default function TrainingDojo() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userStats, setUserStats] = useState({ totalXp: 0, challengesCompleted: 0, currentStreak: 0, level: 1 });

  useEffect(() => {
    if (!isLoaded || !userId) return;
    fetchStats();
  }, [userId, isLoaded]);

  async function fetchStats() {
    try {
      const res = await fetch("/api/xp");
      if (res.ok) {
        const data = await res.json();
        setUserStats({ totalXp: data.xp || 0, challengesCompleted: data.challenges_completed || 0, currentStreak: data.streak || 0, level: data.level || 1 });
      }
    } catch (error) { console.error("Failed to fetch stats:", error); }
    finally { setLoading(false); }
  }

  const filteredChallenges = selectedCategory === "All" ? challenges : challenges.filter((c) => c.category === selectedCategory);

  if (!isLoaded || loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center"><div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl"><Swords className="w-12 h-12 text-orange-400" /></div></div>
          <h1 className="text-4xl font-bold">Training Dojo</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">Sharpen your skills through practice, roleplay, and challenges</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center"><div className="flex justify-center mb-2"><Star className="w-6 h-6 text-yellow-400" /></div><div className="text-2xl font-bold">{userStats.totalXp}</div><div className="text-xs text-zinc-500">Total XP</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center"><div className="flex justify-center mb-2"><Trophy className="w-6 h-6 text-amber-400" /></div><div className="text-2xl font-bold">{userStats.challengesCompleted}</div><div className="text-xs text-zinc-500">Challenges</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center"><div className="flex justify-center mb-2"><Flame className="w-6 h-6 text-orange-400" /></div><div className="text-2xl font-bold">{userStats.currentStreak}</div><div className="text-xs text-zinc-500">Day Streak</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center"><div className="flex justify-center mb-2"><Medal className="w-6 h-6 text-violet-400" /></div><div className="text-2xl font-bold">Lv.{userStats.level}</div><div className="text-xs text-zinc-500">Your Level</div></div>
        </div>

        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4"><div className="p-3 bg-orange-500/20 rounded-xl"><Zap className="w-8 h-8 text-orange-400" /></div><div><h3 className="text-xl font-bold">Daily Challenge</h3><p className="text-zinc-400">Complete today's challenge for bonus XP</p></div></div>
            <Link href="/roleplay-coach?daily=true" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-medium hover:opacity-90"><Play className="w-5 h-5" />Start Daily Challenge</Link>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-green-400" />Skill Tracks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {skillTracks.map((skill) => (
              <div key={skill.id} className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-zinc-700 rounded-lg">{skill.icon}</div><div><div className="font-medium">{skill.name}</div><div className="text-xs text-zinc-500">Level {skill.level}/{skill.maxLevel}</div></div></div>
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full" style={{ width: `${(skill.xp / skill.xpToNext) * 100}%` }} /></div>
                <div className="text-xs text-zinc-500 mt-1 text-right">{skill.xp}/{skill.xpToNext} XP</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categoryFilters.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"}`}>{cat}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChallenges.map((challenge) => (
            <Link key={challenge.id} href={challenge.href} className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-all">
              <div className="flex items-start justify-between mb-3"><div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700">{challenge.icon}</div></div>
              <h3 className="text-lg font-bold mb-1">{challenge.name}</h3>
              <p className="text-sm text-zinc-400 mb-3">{challenge.description}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-1 rounded-md text-xs border ${difficultyColors[challenge.difficulty]}`}>{challenge.difficulty}</span>
                <span className="px-2 py-1 bg-zinc-800 rounded-md text-xs text-zinc-400">{challenge.category}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-zinc-500"><Clock className="w-4 h-4" />{challenge.duration}</div>
                <div className="flex items-center gap-1 text-yellow-400"><Star className="w-4 h-4" />+{challenge.xp} XP</div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm font-medium text-violet-400 group-hover:text-violet-300">Start Challenge<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
            </Link>
          ))}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4"><div className="p-3 bg-purple-500/20 rounded-xl"><BookOpen className="w-8 h-8 text-purple-400" /></div><div><h3 className="text-xl font-bold">Philosophy Dojo</h3><p className="text-zinc-400">Explore wisdom, ethics, and life's big questions</p></div></div>
            <Link href="/philosophy-dojo" className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium"><Brain className="w-5 h-5" />Enter Dojo</Link>
          </div>
        </div>

        <div className="text-center"><p className="text-zinc-400 mb-4">Need guidance before practicing?</p><Link href="/coaches" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium">Visit the Coaches Hub<ArrowRight className="w-4 h-4" /></Link></div>
      </div>
    </div>
  );
}

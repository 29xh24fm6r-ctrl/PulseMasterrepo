"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, Briefcase, Phone, Heart, Brain, Target, Sparkles, MessageCircle, Compass, Zap, DollarSign, Mic, Dumbbell, ArrowRight } from "lucide-react";

const coaches = [
  { id: "career", name: "Career Coach", tagline: "Navigate your professional journey", description: "Strategic career guidance, job transitions, skill development.", icon: <Briefcase className="w-8 h-8" />, href: "/career-coach", gradient: "from-blue-500 to-cyan-500", capabilities: ["Career planning", "Resume review", "Interview prep", "Salary negotiation"], category: "career" },
  { id: "deal", name: "Deal Coach", tagline: "Close more deals with confidence", description: "Sales strategy, deal analysis, objection handling.", icon: <DollarSign className="w-8 h-8" />, href: "/deals", gradient: "from-green-500 to-emerald-500", capabilities: ["Deal strategy", "Objection handling", "Proposal review", "Win analysis"], category: "career" },
  { id: "call", name: "Call Coach", tagline: "Master every conversation", description: "Pre-call prep, real-time guidance, post-call analysis.", icon: <Phone className="w-8 h-8" />, href: "/call-coach", gradient: "from-violet-500 to-purple-500", capabilities: ["Call preparation", "Talk tracks", "Objection scripts", "Follow-up strategy"], category: "career" },
  { id: "relationship", name: "Relationship Advisor", tagline: "Build deeper connections", description: "Improve communication, resolve conflicts, strengthen relationships.", icon: <Heart className="w-8 h-8" />, href: "/confidant", gradient: "from-pink-500 to-rose-500", capabilities: ["Communication tips", "Conflict resolution", "Empathy building", "Relationship health"], category: "relationships" },
  { id: "identity", name: "Identity Coach", tagline: "Become who you want to be", description: "Define identities, align actions, build momentum toward your ideal self.", icon: <Sparkles className="w-8 h-8" />, href: "/identity", gradient: "from-purple-500 to-pink-500", capabilities: ["Identity definition", "Values alignment", "Habit linking", "Momentum tracking"], category: "growth" },
  { id: "strategy", name: "Strategy Chief", tagline: "Think bigger, plan smarter", description: "Life strategy, big decisions, scenario planning, long-term vision.", icon: <Compass className="w-8 h-8" />, href: "/life-intelligence/simulation", gradient: "from-indigo-500 to-blue-500", capabilities: ["Life strategy", "Decision frameworks", "Scenario planning", "Goal setting"], category: "strategy" },
  { id: "health", name: "Health Balancer", tagline: "Optimize your wellbeing", description: "Energy management, stress reduction, work-life balance.", icon: <Dumbbell className="w-8 h-8" />, href: "/wellness", gradient: "from-emerald-500 to-teal-500", capabilities: ["Energy tracking", "Stress management", "Break reminders", "Wellness tips"], category: "wellness" },
  { id: "live", name: "Live Coach", tagline: "Real-time guidance", description: "In-the-moment coaching during calls, meetings, conversations.", icon: <Mic className="w-8 h-8" />, href: "/live-coach", gradient: "from-red-500 to-pink-500", capabilities: ["Live prompts", "Real-time tips", "Situation analysis", "Quick responses"], category: "career" },
  { id: "roleplay", name: "Roleplay Coach", tagline: "Practice makes perfect", description: "Simulate tough conversations, negotiations, scenarios.", icon: <Users className="w-8 h-8" />, href: "/roleplay-coach", gradient: "from-amber-500 to-orange-500", capabilities: ["Scenario practice", "Negotiation sims", "Difficult conversations", "Feedback"], category: "growth" },
];

const categories = [
  { id: "all", label: "All Coaches", icon: <Users className="w-4 h-4" /> },
  { id: "career", label: "Career", icon: <Briefcase className="w-4 h-4" /> },
  { id: "relationships", label: "Relationships", icon: <Heart className="w-4 h-4" /> },
  { id: "growth", label: "Growth", icon: <Sparkles className="w-4 h-4" /> },
  { id: "wellness", label: "Wellness", icon: <Dumbbell className="w-4 h-4" /> },
  { id: "strategy", label: "Strategy", icon: <Compass className="w-4 h-4" /> },
];

export default function CoachesHub() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const filteredCoaches = selectedCategory === "all" ? coaches : coaches.filter((c) => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center"><div className="p-4 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-2xl"><Brain className="w-12 h-12 text-violet-400" /></div></div>
          <h1 className="text-4xl font-bold">AI Coaches</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">Your personal team of AI coaches, ready to help you grow in every area of life</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/realtime-voice" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl font-medium hover:opacity-90"><Mic className="w-5 h-5" />Talk to a Coach</Link>
          <Link href="/dojo" className="flex items-center gap-2 px-6 py-3 bg-zinc-800 border border-zinc-700 rounded-xl font-medium hover:bg-zinc-700"><Dumbbell className="w-5 h-5" />Training Dojo</Link>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat.id ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"}`}>{cat.icon}{cat.label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach) => (
            <Link key={coach.id} href={coach.href} className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all hover:shadow-xl">
              <div className={`p-6 bg-gradient-to-r ${coach.gradient} bg-opacity-10`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${coach.gradient} bg-opacity-20`}>{coach.icon}</div>
                  <div><h3 className="text-xl font-bold">{coach.name}</h3><p className="text-sm text-zinc-300">{coach.tagline}</p></div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-zinc-400 text-sm">{coach.description}</p>
                <div className="flex flex-wrap gap-2">{coach.capabilities.map((cap) => <span key={cap} className="px-2 py-1 bg-zinc-800 rounded-md text-xs text-zinc-400">{cap}</span>)}</div>
                <div className="flex items-center gap-2 text-sm font-medium text-violet-400 group-hover:text-violet-300">Start Session<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Not sure where to start?</h2>
          <p className="text-zinc-400 mb-6">Talk to our AI and we'll help you find the right coach for your needs</p>
          <Link href="/realtime-voice" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl font-medium text-lg hover:opacity-90"><MessageCircle className="w-6 h-6" />Start a Conversation</Link>
        </div>
      </div>
    </div>
  );
}

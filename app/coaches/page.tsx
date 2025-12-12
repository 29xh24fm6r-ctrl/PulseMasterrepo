"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  DollarSign, 
  Briefcase, 
  Users, 
  Sparkles, 
  Heart, 
  Dumbbell, 
  Brain, 
  Wallet,
  Sword,
  ArrowRight,
  Search,
  TrendingUp
} from "lucide-react";

interface Coach {
  id: string;
  name: string;
  description: string;
  tags: string[];
  href: string;
  icon: React.ReactNode;
  gradient: string;
}

const coaches: Coach[] = [
  {
    id: "deal",
    name: "Deal Coach",
    description: "Work through live deals, analyze opportunities, and close with confidence",
    tags: ["Work", "Money"],
    href: "/deal-coach",
    icon: <DollarSign className="w-6 h-6" />,
    gradient: "from-green-500 to-emerald-500"
  },
  {
    id: "sales",
    name: "Sales Coach",
    description: "Practice realistic sales scenarios with roleplay. The coach remembers your training history and gives targeted feedback.",
    tags: ["Work", "Money"],
    href: "/coaches/sales",
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: "from-orange-500 to-red-500"
  },
  {
    id: "career",
    name: "Career Coach",
    description: "Navigate career transitions, skill development, and professional growth",
    tags: ["Work"],
    href: "/career-coach",
    icon: <Briefcase className="w-6 h-6" />,
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    id: "roleplay",
    name: "Roleplay Coach",
    description: "Practice hard conversations, negotiations, and difficult scenarios",
    tags: ["Work", "Life"],
    href: "/roleplay-coach",
    icon: <Users className="w-6 h-6" />,
    gradient: "from-amber-500 to-orange-500"
  },
  {
    id: "motivation",
    name: "Motivational Coach",
    description: "Get personalized motivation and encouragement tailored to your goals",
    tags: ["Mind"],
    href: "/motivation",
    icon: <Sparkles className="w-6 h-6" />,
    gradient: "from-purple-500 to-pink-500"
  },
  {
    id: "confidant",
    name: "Confidant",
    description: "A safe space for emotional support, reflection, and personal growth",
    tags: ["Mind", "Life"],
    href: "/confidant",
    icon: <Heart className="w-6 h-6" />,
    gradient: "from-pink-500 to-rose-500"
  },
  {
    id: "wellness",
    name: "Wellness Coach",
    description: "Optimize your physical and mental wellbeing, energy, and balance",
    tags: ["Body", "Mind"],
    href: "/wellness",
    icon: <Dumbbell className="w-6 h-6" />,
    gradient: "from-emerald-500 to-teal-500"
  },
  {
    id: "executive",
    name: "Executive Function Coach",
    description: "Build focus, organization, and productivity skills",
    tags: ["Work", "Mind"],
    href: "/productivity",
    icon: <Brain className="w-6 h-6" />,
    gradient: "from-indigo-500 to-blue-500"
  },
  {
    id: "financial",
    name: "Financial Coach",
    description: "Plan your finances, make smart money decisions, and build wealth",
    tags: ["Money"],
    href: "/financial-coach",
    icon: <Wallet className="w-6 h-6" />,
    gradient: "from-yellow-500 to-amber-500"
  },
  {
    id: "philosophy",
    name: "Philosophy Dojo",
    description: "Train in life philosophies: Stoic, Samurai, Taoist, and more",
    tags: ["Mind", "Life"],
    href: "/philosophy-dojo",
    icon: <Sword className="w-6 h-6" />,
    gradient: "from-violet-500 to-purple-500"
  }
];

const tagColors: Record<string, string> = {
  Work: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Life: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Money: "bg-green-500/20 text-green-400 border-green-500/30",
  Mind: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Body: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
};

export default function CoachesCorner() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentCoaches, setRecentCoaches] = useState<Coach[]>([]);

  useEffect(() => {
    // Load recent coaches from localStorage
    const recent = localStorage.getItem("recentCoaches");
    if (recent) {
      try {
        const recentIds = JSON.parse(recent) as string[];
        const recentCoachesList = recentIds
          .map(id => coaches.find(c => c.id === id))
          .filter(Boolean) as Coach[];
        setRecentCoaches(recentCoachesList.slice(0, 3));
      } catch (e) {
        console.error("Failed to load recent coaches", e);
      }
    }
  }, []);

  const trackCoachVisit = (coachId: string) => {
    const recent = localStorage.getItem("recentCoaches");
    let recentIds: string[] = recent ? JSON.parse(recent) : [];
    recentIds = [coachId, ...recentIds.filter(id => id !== coachId)].slice(0, 10);
    localStorage.setItem("recentCoaches", JSON.stringify(recentIds));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/coach/router", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.recommendedCoach) {
          trackCoachVisit(data.recommendedCoach);
          router.push(data.href);
        }
      }
    } catch (error) {
      console.error("Failed to route coach", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCoaches = coaches.filter(coach =>
    coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coach.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coach.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Coaches Corner
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Your personal team of AI coaches, ready to help you grow in every area of life
          </p>
        </header>

        {/* Search Box */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Finding..." : "Find Coach"}
            </button>
          </div>
        </form>

        {/* Recent Coaches */}
        {recentCoaches.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-zinc-300 mb-4">Recent Coaches</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentCoaches.map((coach) => (
                <Link
                  key={coach.id}
                  href={coach.href}
                  onClick={() => trackCoachVisit(coach.id)}
                  className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all"
                >
                  <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${coach.gradient} bg-opacity-20 mb-3`}>
                    {coach.icon}
                  </div>
                  <h3 className="font-semibold text-white mb-1">{coach.name}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2">{coach.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Coaches Grid */}
        <section>
          <h2 className="text-xl font-semibold text-zinc-300 mb-4">All Coaches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoaches.map((coach) => (
              <Link
                key={coach.id}
                href={coach.href}
                onClick={() => trackCoachVisit(coach.id)}
                className="group bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all hover:shadow-xl"
              >
                <div className={`p-6 bg-gradient-to-r ${coach.gradient} bg-opacity-10`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${coach.gradient} bg-opacity-20`}>
                      {coach.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{coach.name}</h3>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-zinc-400 text-sm leading-relaxed">{coach.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {coach.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${tagColors[tag] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-violet-400 group-hover:text-violet-300 pt-2">
                    Open Coach
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

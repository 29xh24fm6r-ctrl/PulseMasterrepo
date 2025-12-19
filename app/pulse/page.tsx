"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Briefcase,
  Users,
  BookOpen,
  GraduationCap,
  Mic,
  Settings,
  FlaskConical,
} from "lucide-react";

interface FeatureCard {
  id: string;
  name: string;
  description: string;
  route: string;
  category: "Core" | "Work" | "Relationships" | "Knowledge" | "Coaching" | "Voice" | "Admin" | "Labs";
  status: "✅ wired" | "🟡 partial" | "🔴 stub";
  lastSync?: string | null;
  icon: React.ReactNode;
  testable?: boolean; // Can run CRUD test
}

const FEATURES: FeatureCard[] = [
  // Core
  {
    id: "tasks",
    name: "Tasks",
    description: "Manage your tasks and to-dos",
    route: "/tasks",
    category: "Core",
    status: "✅ wired",
    icon: <CheckCircle2 className="w-5 h-5" />,
    testable: true,
  },
  {
    id: "planner",
    name: "Planner",
    description: "Daily and weekly planning",
    route: "/planner",
    category: "Core",
    status: "✅ wired",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    id: "habits",
    name: "Habits",
    description: "Track daily habits and streaks",
    route: "/habits",
    category: "Core",
    status: "✅ wired",
    icon: <CheckCircle2 className="w-5 h-5" />,
    testable: true,
  },
  {
    id: "streaks",
    name: "Streaks",
    description: "View your habit streaks",
    route: "/streaks",
    category: "Core",
    status: "✅ wired",
    icon: <Clock className="w-5 h-5" />,
  },
  // Work
  {
    id: "deals",
    name: "Deals",
    description: "Pipeline and deal management",
    route: "/deals",
    category: "Work",
    status: "✅ wired",
    icon: <Briefcase className="w-5 h-5" />,
    testable: true,
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Productivity and work analytics",
    route: "/analytics",
    category: "Work",
    status: "🟡 partial",
    icon: <Briefcase className="w-5 h-5" />,
  },
  // Relationships
  {
    id: "contacts",
    name: "Contacts",
    description: "Manage your network",
    route: "/contacts",
    category: "Relationships",
    status: "✅ wired",
    icon: <Users className="w-5 h-5" />,
    testable: true,
  },
  {
    id: "follow-ups",
    name: "Follow-ups",
    description: "Track and schedule follow-ups",
    route: "/follow-ups",
    category: "Relationships",
    status: "🟡 partial",
    icon: <Users className="w-5 h-5" />,
  },
  // Knowledge
  {
    id: "journal",
    name: "Journal",
    description: "Daily journaling and reflections",
    route: "/journal",
    category: "Knowledge",
    status: "✅ wired",
    icon: <BookOpen className="w-5 h-5" />,
    testable: true,
  },
  {
    id: "vault",
    name: "Vault",
    description: "Personal knowledge base",
    route: "/vault",
    category: "Knowledge",
    status: "✅ wired",
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    id: "second-brain",
    name: "Second Brain",
    description: "Connected knowledge system",
    route: "/second-brain",
    category: "Knowledge",
    status: "✅ wired",
    icon: <BookOpen className="w-5 h-5" />,
  },
  // Coaching
  {
    id: "coaches",
    name: "Coaches",
    description: "AI coaching sessions",
    route: "/coaches",
    category: "Coaching",
    status: "✅ wired",
    icon: <GraduationCap className="w-5 h-5" />,
  },
  {
    id: "philosophy-dojo",
    name: "Philosophy Dojo",
    description: "Personal development training",
    route: "/philosophy-dojo",
    category: "Coaching",
    status: "🟡 partial",
    icon: <GraduationCap className="w-5 h-5" />,
  },
  // Voice
  {
    id: "voice",
    name: "Voice",
    description: "Voice interface and commands",
    route: "/voice",
    category: "Voice",
    status: "🟡 partial",
    icon: <Mic className="w-5 h-5" />,
  },
  {
    id: "voice-settings",
    name: "Voice Settings",
    description: "Configure voice preferences",
    route: "/settings/voice",
    category: "Voice",
    status: "✅ wired",
    icon: <Settings className="w-5 h-5" />,
  },
  // Admin
  {
    id: "scheduler-admin",
    name: "Scheduler Admin",
    description: "Job queue and scheduler monitoring",
    route: "/admin/scheduler",
    category: "Admin",
    status: "✅ wired",
    icon: <Settings className="w-5 h-5" />,
  },
  {
    id: "ops-jobs",
    name: "Ops: Jobs",
    description: "System operations and job monitoring",
    route: "/ops/jobs",
    category: "Admin",
    status: "✅ wired",
    icon: <Settings className="w-5 h-5" />,
  },
  // Labs
  {
    id: "frontier",
    name: "Frontier",
    description: "Experimental features",
    route: "/frontier",
    category: "Labs",
    status: "🔴 stub",
    icon: <FlaskConical className="w-5 h-5" />,
  },
  {
    id: "xp-demo",
    name: "XP Demo",
    description: "Experience demonstrations",
    route: "/xp-demo",
    category: "Labs",
    status: "🔴 stub",
    icon: <FlaskConical className="w-5 h-5" />,
  },
];

const CATEGORIES = ["Core", "Work", "Relationships", "Knowledge", "Coaching", "Voice", "Admin", "Labs"] as const;

function statusColor(status: FeatureCard["status"]) {
  if (status === "✅ wired") return "text-emerald-400";
  if (status === "🟡 partial") return "text-yellow-400";
  return "text-red-400";
}

export default function PulseHubPage() {
  const [healthData, setHealthData] = useState<Record<string, string | null>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; testing: boolean }>>({});

  useEffect(() => {
    // Fetch last action timestamps for testable features
    async function loadHealth() {
      const testableFeatures = FEATURES.filter((f) => f.testable);
      for (const feature of testableFeatures) {
        try {
          // This would ideally come from a dedicated endpoint, but for now we'll fetch during test
        } catch (err) {
          // Ignore
        }
      }
    }
    loadHealth();
  }, []);

  async function runTest(featureId: string) {
    setTestResults((prev) => ({ ...prev, [featureId]: { ok: false, testing: true } }));

    try {
      const res = await fetch("/api/features/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: featureId }),
      });

      const data = await res.json();
      const ok = data.ok && data.result?.ok;

      setTestResults((prev) => ({ ...prev, [featureId]: { ok, testing: false } }));

      // Update last sync if test passed and returned timestamp
      if (ok && data.result?.details?.lastUpdated) {
        setHealthData((prev) => ({ ...prev, [featureId]: data.result.details.lastUpdated }));
      }

      // Clear result after 3 seconds
      setTimeout(() => {
        setTestResults((prev) => {
          const next = { ...prev };
          delete next[featureId];
          return next;
        });
      }, 3000);
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [featureId]: { ok: false, testing: false } }));
    }
  }

  const featuresByCategory = CATEGORIES.map((cat) => ({
    category: cat,
    features: FEATURES.filter((f) => f.category === cat),
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Pulse Hub</h1>
          <p className="text-sm text-zinc-400 mt-2">Your command center for everything Pulse</p>
        </div>

        {/* Categories */}
        {featuresByCategory.map(({ category, features }) => {
          if (features.length === 0) return null;

          return (
            <div key={category}>
              <h2 className="text-xl font-semibold text-white mb-4">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <Link
                    key={feature.id}
                    href={feature.route}
                    className="block p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-violet-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-violet-400">{feature.icon}</div>
                        <div>
                          <h3 className="text-white font-medium">{feature.name}</h3>
                          <p className="text-xs text-zinc-400 mt-1">{feature.description}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${statusColor(feature.status)}`}>
                        {feature.status.replace(/[✅🟡🔴]/g, "").trim()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                      <div className="flex items-center gap-2">
                        {testResults[feature.id]?.testing ? (
                          <span className="text-xs text-zinc-500">Testing...</span>
                        ) : testResults[feature.id]?.ok === true ? (
                          <span className="text-xs text-emerald-400">✓ Test passed</span>
                        ) : testResults[feature.id]?.ok === false ? (
                          <span className="text-xs text-red-400">✗ Test failed</span>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            {healthData[feature.id]
                              ? `Last: ${new Date(healthData[feature.id]!).toLocaleDateString()}`
                              : "Ready"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {feature.testable && (
                          <button
                            onClick={() => runTest(feature.id)}
                            disabled={testResults[feature.id]?.testing}
                            className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                          >
                            Test
                          </button>
                        )}
                        <ArrowRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

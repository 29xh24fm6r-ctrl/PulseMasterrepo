"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Zap, Brain, Shield, Eye, Bell, Mail, Calendar,
  CheckSquare, Users, DollarSign, BookOpen, Sparkles, Save,
  Loader2, ChevronRight, Info, Rocket, Handshake, MessageSquare, Leaf
} from "lucide-react";
import { useAutonomy, AutonomyLevel, AutonomySettings, DomainKey, DEFAULT_AUTONOMY_SETTINGS } from "@/lib/use-autonomy";

// ============================================
// CONSTANTS
// ============================================

const AUTONOMY_LEVELS: {
  id: AutonomyLevel;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    id: "jarvis",
    name: "Jarvis Mode",
    icon: <Rocket className="w-6 h-6" />,
    tagline: "Full Autopilot",
    description: "Pulse handles everything automatically. Creates tasks from emails, sends follow-ups, updates deals, manages your calendar. You just live your life - Pulse has your back.",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/50",
  },
  {
    id: "copilot",
    name: "Co-Pilot Mode",
    icon: <Handshake className="w-6 h-6" />,
    tagline: "Smart Partnership",
    description: "Pulse handles routine tasks automatically but asks before high-stakes actions like sending emails, closing deals, or scheduling meetings. Best of both worlds.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/50",
  },
  {
    id: "advisor",
    name: "Advisor Mode",
    icon: <MessageSquare className="w-6 h-6" />,
    tagline: "Suggest & Confirm",
    description: "Pulse analyzes and suggests actions, but waits for your approval before doing anything. You stay in full control while getting AI-powered recommendations.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/50",
  },
  {
    id: "zen",
    name: "Zen Mode",
    icon: <Leaf className="w-6 h-6" />,
    tagline: "Minimal & Calm",
    description: "Pulse only speaks when spoken to. No proactive notifications, no auto-actions. For deep work, vacation, or when you need mental space.",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/50",
  },
];

const DOMAINS: {
  id: DomainKey;
  name: string;
  icon: React.ReactNode;
  description: string;
  examples: string[];
}[] = [
  {
    id: "email",
    name: "Email Intelligence",
    icon: <Mail className="w-5 h-5" />,
    description: "Scanning inbox, extracting tasks, identifying contacts",
    examples: ["Auto-create tasks from emails", "Extract action items", "Identify important contacts"],
  },
  {
    id: "tasks",
    name: "Task Management",
    icon: <CheckSquare className="w-5 h-5" />,
    description: "Creating, prioritizing, and managing tasks",
    examples: ["Auto-prioritize based on context", "Reschedule overdue items", "Break down large tasks"],
  },
  {
    id: "deals",
    name: "Deal Pipeline",
    icon: <DollarSign className="w-5 h-5" />,
    description: "Tracking deals, suggesting next steps, risk alerts",
    examples: ["Update deal stages", "Alert on stale deals", "Suggest follow-up timing"],
  },
  {
    id: "relationships",
    name: "Relationships",
    icon: <Users className="w-5 h-5" />,
    description: "Contact management, follow-up reminders, relationship health",
    examples: ["Track last contact", "Suggest check-ins", "Relationship intelligence"],
  },
  {
    id: "calendar",
    name: "Calendar & Scheduling",
    icon: <Calendar className="w-5 h-5" />,
    description: "Meeting prep, scheduling, time blocking",
    examples: ["Pre-meeting briefings", "Smart scheduling", "Focus time protection"],
  },
  {
    id: "habits",
    name: "Habits & Routines",
    icon: <Zap className="w-5 h-5" />,
    description: "Habit tracking, streak protection, routine optimization",
    examples: ["Streak risk alerts", "Optimal timing suggestions", "Recovery protocols"],
  },
  {
    id: "journal",
    name: "Journaling & Reflection",
    icon: <BookOpen className="w-5 h-5" />,
    description: "Prompts, insights extraction, pattern recognition",
    examples: ["Evening prompts", "Extract themes", "Emotional pattern alerts"],
  },
  {
    id: "notifications",
    name: "Proactive Alerts",
    icon: <Bell className="w-5 h-5" />,
    description: "When and how Pulse reaches out to you",
    examples: ["Morning briefings", "Urgent alerts", "Daily summaries"],
  },
];

// ============================================
// COMPONENT
// ============================================

export default function AutonomySettingsPage() {
  const { settings, loaded, updateSettings } = useAutonomy();
  const [localSettings, setLocalSettings] = useState<AutonomySettings>(DEFAULT_AUTONOMY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  // Sync with global settings when loaded
  useEffect(() => {
    if (loaded) {
      setLocalSettings(settings);
    }
  }, [loaded, settings]);

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    updateSettings(localSettings);
    await new Promise(resolve => setTimeout(resolve, 300));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedLevel = AUTONOMY_LEVELS.find(l => l.id === localSettings.globalLevel) || AUTONOMY_LEVELS[0];

  if (!loaded) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-400" />
                Pulse Autonomy
              </h1>
              <p className="text-sm text-slate-400">How much should Pulse handle for you?</p>
            </div>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              saved
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Philosophy Banner */}
        <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">The Pulse Philosophy</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Pulse should never be a chore. It&apos;s designed to be the greatest AI assistant ever created - 
                anticipating your needs before you know them, handling the mundane so you can focus on what matters. 
                <strong className="text-purple-300"> The more autonomy you give Pulse, the lighter your mental load becomes.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Global Autonomy Level */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Global Autonomy Level
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUTONOMY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setLocalSettings(s => ({ ...s, globalLevel: level.id }))}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  localSettings.globalLevel === level.id
                    ? `${level.bgColor} ${level.borderColor}`
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${level.bgColor} ${level.color}`}>
                    {level.icon}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${localSettings.globalLevel === level.id ? level.color : "text-white"}`}>
                      {level.name}
                    </h3>
                    <p className="text-xs text-slate-400">{level.tagline}</p>
                  </div>
                  {localSettings.globalLevel === level.id && (
                    <div className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${level.bgColor} ${level.color}`}>
                      Active
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {level.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Current Mode Summary */}
        <div className={`${selectedLevel.bgColor} border ${selectedLevel.borderColor} rounded-2xl p-5`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg bg-slate-900/50 ${selectedLevel.color}`}>
              {selectedLevel.icon}
            </div>
            <div>
              <h3 className="font-semibold text-white">Currently: {selectedLevel.name}</h3>
              <p className={`text-sm ${selectedLevel.color}`}>{selectedLevel.tagline}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <h4 className="text-sm font-medium text-slate-300 mb-2">What this means:</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              {localSettings.globalLevel === "jarvis" && (
                <>
                  <li className="flex items-center gap-2">✅ Auto-creates tasks from emails</li>
                  <li className="flex items-center gap-2">✅ Sends follow-up reminders</li>
                  <li className="flex items-center gap-2">✅ Updates deal stages when detected</li>
                  <li className="flex items-center gap-2">✅ Manages your calendar intelligently</li>
                  <li className="flex items-center gap-2">✅ Protects your streaks proactively</li>
                </>
              )}
              {localSettings.globalLevel === "copilot" && (
                <>
                  <li className="flex items-center gap-2">✅ Auto-creates tasks from emails</li>
                  <li className="flex items-center gap-2">⚡ Asks before sending any messages</li>
                  <li className="flex items-center gap-2">⚡ Confirms before deal stage changes</li>
                  <li className="flex items-center gap-2">⚡ Asks before scheduling meetings</li>
                  <li className="flex items-center gap-2">✅ Protects your streaks proactively</li>
                </>
              )}
              {localSettings.globalLevel === "advisor" && (
                <>
                  <li className="flex items-center gap-2">💡 Suggests tasks from emails</li>
                  <li className="flex items-center gap-2">💡 Recommends follow-ups</li>
                  <li className="flex items-center gap-2">💡 Suggests deal stage updates</li>
                  <li className="flex items-center gap-2">💡 Proposes calendar changes</li>
                  <li className="flex items-center gap-2">💡 Alerts on streak risks</li>
                </>
              )}
              {localSettings.globalLevel === "zen" && (
                <>
                  <li className="flex items-center gap-2">🧘 No proactive notifications</li>
                  <li className="flex items-center gap-2">🧘 No automatic actions</li>
                  <li className="flex items-center gap-2">🧘 Pulse only responds when asked</li>
                  <li className="flex items-center gap-2">🧘 Perfect for deep work or rest</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Domain-Specific Overrides */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Domain-Specific Settings
            </h2>
            <button
              onClick={() => setLocalSettings(s => ({ ...s, useDomainOverrides: !s.useDomainOverrides }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                localSettings.useDomainOverrides
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {localSettings.useDomainOverrides ? "Custom" : "Use Global"}
            </button>
          </div>

          {!localSettings.useDomainOverrides ? (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-sm">
                All domains use <strong className={selectedLevel.color}>{selectedLevel.name}</strong>. 
                Enable custom settings to fine-tune each area.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {DOMAINS.map((domain) => {
                const domainLevel = AUTONOMY_LEVELS.find(l => l.id === localSettings.domains[domain.id]);
                return (
                  <div
                    key={domain.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
                      className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-slate-700/50 text-slate-300">
                        {domain.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{domain.name}</h3>
                        <p className="text-xs text-slate-400">{domain.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${domainLevel?.color || "text-slate-400"}`}>
                          {domainLevel?.name || "Unknown"}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${
                          expandedDomain === domain.id ? "rotate-90" : ""
                        }`} />
                      </div>
                    </button>
                    
                    {expandedDomain === domain.id && (
                      <div className="px-4 pb-4 border-t border-slate-700/50">
                        <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {AUTONOMY_LEVELS.map((level) => (
                            <button
                              key={level.id}
                              onClick={() => setLocalSettings(s => ({
                                ...s,
                                domains: { ...s.domains, [domain.id]: level.id }
                              }))}
                              className={`p-3 rounded-xl text-center transition-all ${
                                localSettings.domains[domain.id] === level.id
                                  ? `${level.bgColor} ${level.borderColor} border`
                                  : "bg-slate-700/50 hover:bg-slate-700"
                              }`}
                            >
                              <div className={`mx-auto mb-1 ${level.color}`}>
                                {level.icon}
                              </div>
                              <span className={`text-xs font-medium ${
                                localSettings.domains[domain.id] === level.id ? level.color : "text-slate-400"
                              }`}>
                                {level.name.replace(" Mode", "")}
                              </span>
                            </button>
                          ))}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <p className="text-xs text-slate-500 mb-2">Examples:</p>
                          <div className="flex flex-wrap gap-2">
                            {domain.examples.map((example, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">
                                {example}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Additional Settings */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Behavior Settings
          </h2>
          
          <div className="space-y-3">
            {/* Proactive Insights */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Proactive Insights</h3>
                  <p className="text-xs text-slate-400">Pulse notices things and tells you before you ask</p>
                </div>
              </div>
              <button
                onClick={() => setLocalSettings(s => ({ ...s, proactiveInsights: !s.proactiveInsights }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  localSettings.proactiveInsights ? "bg-purple-500" : "bg-slate-600"
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  localSettings.proactiveInsights ? "translate-x-6" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {/* Voice Greetings */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Voice Greetings</h3>
                  <p className="text-xs text-slate-400">Pulse speaks first with insights when you connect</p>
                </div>
              </div>
              <button
                onClick={() => setLocalSettings(s => ({ ...s, voiceGreetings: !s.voiceGreetings }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  localSettings.voiceGreetings ? "bg-cyan-500" : "bg-slate-600"
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  localSettings.voiceGreetings ? "translate-x-6" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {/* Quiet Hours */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Quiet Hours</h3>
                    <p className="text-xs text-slate-400">Pulse goes silent during these times</p>
                  </div>
                </div>
                <button
                  onClick={() => setLocalSettings(s => ({ 
                    ...s, 
                    quietHours: { ...s.quietHours, enabled: !s.quietHours.enabled }
                  }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    localSettings.quietHours.enabled ? "bg-green-500" : "bg-slate-600"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    localSettings.quietHours.enabled ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              
              {localSettings.quietHours.enabled && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">From</span>
                    <input
                      type="time"
                      value={localSettings.quietHours.start}
                      onChange={(e) => setLocalSettings(s => ({
                        ...s,
                        quietHours: { ...s.quietHours, start: e.target.value }
                      }))}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">to</span>
                    <input
                      type="time"
                      value={localSettings.quietHours.end}
                      onChange={(e) => setLocalSettings(s => ({
                        ...s,
                        quietHours: { ...s.quietHours, end: e.target.value }
                      }))}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Critical Only */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Critical Only Mode</h3>
                  <p className="text-xs text-slate-400">Only alert on truly urgent items (overdue, at-risk)</p>
                </div>
              </div>
              <button
                onClick={() => setLocalSettings(s => ({ ...s, criticalOnly: !s.criticalOnly }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  localSettings.criticalOnly ? "bg-red-500" : "bg-slate-600"
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  localSettings.criticalOnly ? "translate-x-6" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Info Card */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-400">
              <p className="mb-2">
                <strong className="text-slate-300">Pro tip:</strong> Start with Jarvis Mode and adjust as needed. 
                Most users find they prefer more automation once they trust Pulse.
              </p>
              <p>
                These settings can be changed anytime. Pulse adapts instantly.
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { CoachUserPreferences } from "@/lib/coaches/types";

export default function CoachPreferencesPage() {
  const [coachType, setCoachType] = useState("sales");
  const [tone, setTone] = useState<CoachUserPreferences["tone"]>("supportive");
  const [difficultyPref, setDifficultyPref] = useState<CoachUserPreferences["difficultyPref"]>("auto");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [coachType]);

  async function loadPreferences() {
    setLoading(true);
    try {
      const res = await fetch(`/api/coaches/preferences?coachType=${coachType}`);
      const data = await res.json();
      if (res.ok && data.preferences) {
        setTone(data.preferences.tone);
        setDifficultyPref(data.preferences.difficultyPref);
      }
    } catch (err) {
      console.error("Failed to load preferences:", err);
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/coaches/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachType,
          tone,
          difficultyPref,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save preferences");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save preferences:", err);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const toneOptions: { value: CoachUserPreferences["tone"]; label: string; description: string }[] = [
    { value: "supportive", label: "Supportive", description: "Encouraging and patient" },
    { value: "direct", label: "Direct", description: "Straightforward and actionable" },
    { value: "drill_sergeant", label: "Drill Sergeant", description: "Intense and demanding" },
    { value: "calm", label: "Calm", description: "Measured and thoughtful" },
  ];

  const difficultyOptions: { value: CoachUserPreferences["difficultyPref"]; label: string }[] = [
    { value: "auto", label: "Auto (adjusts based on performance)" },
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "expert", label: "Expert" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
            <Link href="/coaches" className="hover:text-zinc-300 transition-colors">
              Coaches Corner
            </Link>
            <span>/</span>
            <span className="text-zinc-400">Preferences</span>
          </nav>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/coaches"
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Coach Preferences</h1>
                <p className="text-xs text-zinc-500">
                  Customize how your coaches interact with you
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center text-zinc-400">Loading preferences...</div>
        ) : (
          <div className="space-y-6">
            {/* Coach Type Selection */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Coach Type
              </label>
              <select
                value={coachType}
                onChange={(e) => setCoachType(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              >
                <option value="sales">Sales Coach</option>
                {/* Add more coach types as they're added */}
              </select>
            </div>

            {/* Tone Selection */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-zinc-300 mb-4">
                Coaching Tone
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {toneOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTone(option.value)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      tone === option.value
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="font-medium text-white mb-1">{option.label}</div>
                    <div className="text-xs text-zinc-400">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Preference */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Difficulty Preference
              </label>
              <select
                value={difficultyPref}
                onChange={(e) => setDifficultyPref(e.target.value as CoachUserPreferences["difficultyPref"])}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              >
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-2">
                {difficultyPref === "auto"
                  ? "The coach will automatically adjust difficulty based on your performance."
                  : "The coach will use this fixed difficulty level."}
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                {saved && <span className="text-green-400">✓ Preferences saved!</span>}
              </div>
              <button
                onClick={savePreferences}
                disabled={saving}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


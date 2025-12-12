// Safety & Boundaries Settings Page
// app/settings/safety/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Info, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface UserSafetySettings {
  allow_mature_but_nonsexual: boolean;
  allow_direct_language: boolean;
  tone_sensitivity: "low" | "normal" | "high";
}

export default function SafetySettingsPage() {
  const [settings, setSettings] = useState<UserSafetySettings>({
    allow_mature_but_nonsexual: false,
    allow_direct_language: true,
    tone_sensitivity: "normal",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/safety/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error("Failed to load safety settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/safety/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Safety settings saved!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading safety settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-violet-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Safety & Boundaries</h1>
            <p className="text-sm text-zinc-400">
              Understand Pulse's safety policies and customize your preferences
            </p>
          </div>
        </div>

        {/* Core Boundaries */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Pulse's Core Boundaries</h2>
          </div>
          <p className="text-sm text-zinc-400">
            These boundaries are non-negotiable and apply to all coaches and personas:
          </p>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              <span>Pulse will never be sexual with you in any way.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              <span>
                Pulse will not help you harm yourself or others. If you're in crisis, Pulse will
                provide supportive resources and encourage professional help.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              <span>
                Pulse can't give medical or legal diagnoses. Pulse can provide general information
                but will encourage consulting licensed professionals.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              <span>
                Pulse will sometimes refuse requests to protect you and maintain appropriate
                boundaries.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              <span>
                Pulse will never use hate speech, slurs, or dehumanizing language.
              </span>
            </li>
          </ul>
        </section>

        {/* User Safety Preferences */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Your Safety Preferences</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Customize how Pulse communicates with you (within safety boundaries):
          </p>

          <div className="space-y-4">
            {/* Tone Sensitivity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Tone Sensitivity</label>
              <div className="flex gap-2">
                {(["low", "normal", "high"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setSettings({ ...settings, tone_sensitivity: level })}
                    className={`px-4 py-2 rounded transition-colors ${
                      settings.tone_sensitivity === level
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                {settings.tone_sensitivity === "high"
                  ? "Pulse will use gentler, more reassuring language"
                  : settings.tone_sensitivity === "low"
                  ? "Pulse can be more direct and straightforward"
                  : "Pulse will use balanced, appropriate tone"}
              </p>
            </div>

            {/* Direct Language */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-zinc-300">
                  Allow Direct Language
                </label>
                <p className="text-xs text-zinc-500">
                  Allow coaches to be more direct and straightforward
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_direct_language}
                onChange={(e) =>
                  setSettings({ ...settings, allow_direct_language: e.target.checked })
                }
                className="w-5 h-5"
              />
            </div>

            {/* Mature but Non-Sexual */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-zinc-300">
                  Allow Mature but Non-Sexual Discussions
                </label>
                <p className="text-xs text-zinc-500">
                  Allow more frank language about relationships, money, and adult topics (still no
                  sexual content)
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_mature_but_nonsexual}
                onChange={(e) =>
                  setSettings({ ...settings, allow_mature_but_nonsexual: e.target.checked })
                }
                className="w-5 h-5"
              />
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </section>

        {/* Why Pulse Might Refuse */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Why Pulse Might Refuse</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Pulse may refuse or redirect requests that violate safety boundaries. This protects both
            you and Pulse's ability to provide helpful, appropriate coaching.
          </p>
          <p className="text-sm text-zinc-400">
            If you believe a refusal was incorrect, you can adjust your safety preferences above or
            rephrase your request.
          </p>
        </section>
      </div>
    </div>
  );
}





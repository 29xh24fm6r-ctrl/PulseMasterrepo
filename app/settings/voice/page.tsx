// Voice Settings Page with Emotion Overrides
// app/settings/voice/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
// Using plain HTML/Tailwind instead of shadcn components

interface VoiceProfile {
  id: string;
  name: string;
  description?: string;
}

interface VoiceOverride {
  id: string;
  coach_id: string;
  emotion: string;
  override_voice: string;
}

const COACHES = [
  { id: "sales", label: "Sales Coach" },
  { id: "confidant", label: "Confidant Coach" },
  { id: "career", label: "Career Coach" },
  { id: "philosophy", label: "Philosophy Sensei" },
  { id: "emotional", label: "Emotional Coach" },
  { id: "autopilot", label: "Autopilot" },
  { id: "roleplay", label: "Roleplay Coach" },
  { id: "general", label: "General Pulse" },
];

const EMOTIONS = ["stress", "sad", "angry", "hype", "calm"];

export default function VoiceSettingsPage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [overrides, setOverrides] = useState<VoiceOverride[]>([]);
  const [coachVoices, setCoachVoices] = useState<Record<string, string | "auto">>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [profilesRes, overridesRes, settingsRes] = await Promise.all([
        fetch("/api/voices/profiles"),
        fetch("/api/voice/overrides"),
        fetch("/api/voice/settings"),
      ]);

      const profilesData = await profilesRes.json();
      const overridesData = await overridesRes.json();
      const settingsData = await settingsRes.json();

      setProfiles(profilesData.profiles || []);
      setOverrides(overridesData.overrides || []);
      setCoachVoices(settingsData?.preferred_coach_voice || {});
    } catch (err) {
      console.error("Failed to load voice settings:", err);
    } finally {
      setLoading(false);
    }
  }

  function getOverride(coachId: string, emotion: string): VoiceOverride | undefined {
    return overrides.find(
      (o) => o.coach_id === coachId && o.emotion === emotion
    );
  }

  async function handleChange(
    coachId: string,
    emotion: string,
    voiceId: string
  ) {
    setSaving(true);
    try {
      const res = await fetch("/api/voice/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_id: coachId,
          emotion,
          override_voice: voiceId,
        }),
      });

      if (!res.ok) throw new Error("Failed to save override");

      // Reload overrides
      const overridesRes = await fetch("/api/voice/overrides");
      const overridesData = await overridesRes.json();
      setOverrides(overridesData.overrides || []);
    } catch (err) {
      console.error("Failed to save override:", err);
      alert("Failed to save override. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(overrideId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/voice/overrides?id=${overrideId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete override");

      // Reload overrides
      const overridesRes = await fetch("/api/voice/overrides");
      const overridesData = await overridesRes.json();
      setOverrides(overridesData.overrides || []);
    } catch (err) {
      console.error("Failed to delete override:", err);
      alert("Failed to delete override. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading voice settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Voice & Emotion Settings</h1>
              <p className="text-xs text-zinc-500">
                Customize how each coach sounds when you&apos;re stressed, hyped, or calm
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Coach Voice Preferences */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Coach Voice Preferences</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Choose a voice persona for each coach, or set to "Auto" for emotion-aware switching.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {COACHES.map((coach) => {
              const currentVoice = coachVoices[coach.id] || "auto";
              return (
                <div key={coach.id} className="flex items-center justify-between gap-4">
                  <label className="text-sm text-zinc-300 flex-1">{coach.label}</label>
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={currentVoice}
                      onChange={async (e) => {
                        const value = e.target.value;
                        const newVoices = { ...coachVoices, [coach.id]: value };
                        setCoachVoices(newVoices);
                        setSaving(true);
                        try {
                          const res = await fetch("/api/voice/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ preferred_coach_voice: newVoices }),
                          });
                          if (!res.ok) throw new Error("Failed to save");
                        } catch (err) {
                          console.error("Failed to save:", err);
                          alert("Failed to save preference");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
                    >
                      <option value="auto">Auto (Emotion-aware)</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.key || p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        const preview = await fetch("/api/voices/preview", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            voiceKey: currentVoice === "auto" ? "friendly_butler" : currentVoice,
                            sampleText: "This is how I sound. I adapt my style to match your needs.",
                          }),
                        });
                        const data = await preview.json();
                        // In production, play TTS audio here
                        alert(`Preview: ${data.text}`);
                      }}
                      className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Emotion Overrides (existing functionality) */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Emotion Overrides</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Override voice for specific emotions (optional).
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {COACHES.map((coach) => (
              <div key={coach.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="p-2 border-b border-zinc-700 mb-3">
                  <h3 className="text-white font-semibold text-sm">{coach.label}</h3>
                </div>
                <div className="space-y-2">
                  {EMOTIONS.map((emotion) => {
                    const current = getOverride(coach.id, emotion);
                    return (
                      <div
                        key={emotion}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs text-zinc-400 capitalize w-16">
                          {emotion}
                        </span>
                        <select
                          value={current?.override_voice || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                              handleChange(coach.id, emotion, value);
                            } else if (current) {
                              handleReset(current.id);
                            }
                          }}
                          disabled={saving}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
                        >
                          <option value="">Default</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


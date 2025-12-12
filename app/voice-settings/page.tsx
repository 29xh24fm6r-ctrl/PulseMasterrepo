"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Volume2,
  Play,
  Square,
  Save,
  Check,
  Sparkles,
} from "lucide-react";

interface VoiceProfile {
  id: string;
  key: string;
  display_name: string;
  description?: string;
  provider: string;
  provider_voice_id: string;
  is_active: boolean;
}

interface UserVoiceSettings {
  user_id: string;
  active_voice_key: string | null;
  speaking_rate: number;
  pitch_adjust: number;
}

export default function VoiceSettingsPage() {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [settings, setSettings] = useState<UserVoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadVoiceSettings();
  }, []);

  async function loadVoiceSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/voice/settings");
      const data = await res.json();
      if (res.ok) {
        setVoices(data.voices || []);
        setSettings(data.settings || {
          active_voice_key: "pulse_default",
          speaking_rate: 1.0,
          pitch_adjust: 0.0,
        });
      }
    } catch (err) {
      console.error("Failed to load voice settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;

    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/voice/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active_voice_key: settings.active_voice_key,
          speaking_rate: settings.speaking_rate,
          pitch_adjust: settings.pitch_adjust,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save voice settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function previewVoice(voiceKey: string) {
    // Stop any currently playing preview
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    setPreviewingVoice(voiceKey);

    try {
      const res = await fetch(
        `/api/voice/preview?voice_key=${voiceKey}&text=Hello! This is Pulse, your AI assistant. How can I help you today?`
      );

      if (!res.ok) throw new Error("Preview failed");

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setPreviewingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPreviewingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      setAudioElement(audio);
      await audio.play();
    } catch (err) {
      console.error("Preview error:", err);
      setPreviewingVoice(null);
    }
  }

  function stopPreview() {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
    }
    setPreviewingVoice(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading voice settings...</div>
      </div>
    );
  }

  const activeVoice = voices.find((v) => v.key === settings?.active_voice_key) || voices[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/settings"
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Volume2 className="w-6 h-6 text-violet-400" />
                <div>
                  <h1 className="text-xl font-bold">Pulse Voice</h1>
                  <p className="text-xs text-zinc-500">
                    Choose how Pulse sounds when it talks to you
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save"}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Current Voice Indicator */}
        {activeVoice && (
          <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-violet-400 mb-1">Current Voice</div>
                <div className="text-lg font-semibold">{activeVoice.display_name}</div>
                {activeVoice.description && (
                  <div className="text-sm text-zinc-400 mt-1">{activeVoice.description}</div>
                )}
              </div>
              <Sparkles className="w-6 h-6 text-violet-400" />
            </div>
          </div>
        )}

        {/* Voice Selection Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Available Voices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {voices.map((voice) => {
              const isActive = settings?.active_voice_key === voice.key;
              const isPreviewing = previewingVoice === voice.key;

              return (
                <div
                  key={voice.id}
                  className={`border rounded-xl p-5 transition-all ${
                    isActive
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{voice.display_name}</h3>
                      {voice.description && (
                        <p className="text-sm text-zinc-400">{voice.description}</p>
                      )}
                    </div>
                    {isActive && (
                      <span className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded text-xs font-medium">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        if (isPreviewing) {
                          stopPreview();
                        } else {
                          previewVoice(voice.key);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isPreviewing ? (
                        <>
                          <Square className="w-4 h-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Preview
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (settings) {
                          setSettings({ ...settings, active_voice_key: voice.key });
                        }
                      }}
                      disabled={isActive}
                      className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                    >
                      {isActive ? "Active" : "Set as Pulse Voice"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Voice Tuning */}
        {settings && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Voice Tuning</h2>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium">Speaking Rate</label>
                    <span className="text-sm text-zinc-400">
                      {settings.speaking_rate.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.1"
                    value={settings.speaking_rate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        speaking_rate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>Slower</span>
                    <span>Faster</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium">Pitch Adjust</label>
                    <span className="text-sm text-zinc-400">
                      {settings.pitch_adjust > 0 ? "+" : ""}
                      {settings.pitch_adjust.toFixed(1)} semitones
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.5"
                    value={settings.pitch_adjust}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pitch_adjust: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>Lower</span>
                    <span>Higher</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

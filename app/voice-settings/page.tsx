"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Volume2,
  Mic,
  Bell,
  Clock,
  Zap,
  Save,
  RotateCcw,
  Check,
} from "lucide-react";

interface VoiceSettings {
  voiceEnabled: boolean;
  autoSpeak: boolean;
  speechRate: number;
  speechPitch: number;
  silenceThreshold: number;
  alertsEnabled: boolean;
  alertTypes: {
    calendar: boolean;
    tasks: boolean;
    suggestions: boolean;
    insights: boolean;
  };
  preferredVoice: string;
  wakeWord: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  voiceEnabled: true,
  autoSpeak: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  silenceThreshold: 200,
  alertsEnabled: true,
  alertTypes: {
    calendar: true,
    tasks: true,
    suggestions: true,
    insights: false,
  },
  preferredVoice: "default",
  wakeWord: false,
};

export default function VoiceSettingsPage() {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testPlaying, setTestPlaying] = useState(false);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices.filter((v) => v.lang.startsWith("en")));
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    // Load saved settings
    const saved = localStorage.getItem("pulse-voice-settings");
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    }
  }, []);

  const updateSetting = <K extends keyof VoiceSettings>(
    key: K,
    value: VoiceSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateAlertType = (type: keyof VoiceSettings["alertTypes"], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      alertTypes: { ...prev.alertTypes, [type]: value },
    }));
    setSaved(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem("pulse-voice-settings", JSON.stringify(settings));

      // Also save to server for persistence
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_settings: settings }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
  };

  const testVoice = () => {
    if (testPlaying) {
      speechSynthesis.cancel();
      setTestPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      "Hello! This is Pulse, your AI assistant. How can I help you today?"
    );
    utterance.rate = settings.speechRate;
    utterance.pitch = settings.speechPitch;

    if (settings.preferredVoice !== "default") {
      const voice = voices.find((v) => v.name === settings.preferredVoice);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => setTestPlaying(true);
    utterance.onend = () => setTestPlaying(false);
    utterance.onerror = () => setTestPlaying(false);

    speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/life"
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Volume2 className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl font-bold">Voice Settings</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetSettings}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Reset to defaults"
              >
                <RotateCcw className="w-5 h-5 text-zinc-400" />
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* General Voice */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5 text-purple-400" />
            General
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Voice Features</p>
                <p className="text-sm text-zinc-400">Enable voice interactions</p>
              </div>
              <button
                onClick={() => updateSetting("voiceEnabled", !settings.voiceEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${settings.voiceEnabled ? "bg-purple-600" : "bg-zinc-700"
                  }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.voiceEnabled ? "translate-x-6" : "translate-x-0.5"
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Speak Responses</p>
                <p className="text-sm text-zinc-400">Pulse speaks responses aloud</p>
              </div>
              <button
                onClick={() => updateSetting("autoSpeak", !settings.autoSpeak)}
                className={`w-12 h-6 rounded-full transition-colors ${settings.autoSpeak ? "bg-purple-600" : "bg-zinc-700"
                  }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.autoSpeak ? "translate-x-6" : "translate-x-0.5"
                    }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Voice Tuning */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-400" />
            Voice Tuning
          </h2>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Speech Rate</p>
                <span className="text-sm text-zinc-400">{settings.speechRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.speechRate}
                onChange={(e) => updateSetting("speechRate", parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Voice Pitch</p>
                <span className="text-sm text-zinc-400">{settings.speechPitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={settings.speechPitch}
                onChange={(e) => updateSetting("speechPitch", parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>Lower</span>
                <span>Higher</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Preferred Voice</p>
              </div>
              <select
                value={settings.preferredVoice}
                onChange={(e) => updateSetting("preferredVoice", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="default">System Default</option>
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={testVoice}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition"
            >
              {testPlaying ? "Stop Test" : "Test Voice"}
            </button>
          </div>
        </section>

        {/* Response Speed */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Response Speed
          </h2>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">Silence Detection</p>
              <span className="text-sm text-zinc-400">{settings.silenceThreshold}ms</span>
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="50"
              value={settings.silenceThreshold}
              onChange={(e) => updateSetting("silenceThreshold", parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>Faster (may interrupt)</span>
              <span>Slower (more patient)</span>
            </div>
          </div>
        </section>

        {/* Proactive Alerts */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Proactive Alerts
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Voice Alerts</p>
                <p className="text-sm text-zinc-400">Pulse speaks important notifications</p>
              </div>
              <button
                onClick={() => updateSetting("alertsEnabled", !settings.alertsEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${settings.alertsEnabled ? "bg-purple-600" : "bg-zinc-700"
                  }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.alertsEnabled ? "translate-x-6" : "translate-x-0.5"
                    }`}
                />
              </button>
            </div>

            {settings.alertsEnabled && (
              <div className="pl-4 border-l-2 border-zinc-700 space-y-3">
                {[
                  { key: "calendar", label: "Calendar reminders", desc: "Upcoming meetings" },
                  { key: "tasks", label: "Task alerts", desc: "Overdue and due today" },
                  { key: "suggestions", label: "AI suggestions", desc: "High priority recommendations" },
                  { key: "insights", label: "New insights", desc: "Third Brain discoveries" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                    <button
                      onClick={() => updateAlertType(key as keyof VoiceSettings["alertTypes"], !settings.alertTypes[key as keyof VoiceSettings["alertTypes"]])}
                      className={`w-10 h-5 rounded-full transition-colors ${settings.alertTypes[key as keyof VoiceSettings["alertTypes"]] ? "bg-purple-600" : "bg-zinc-700"
                        }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.alertTypes[key as keyof VoiceSettings["alertTypes"]] ? "translate-x-5" : "translate-x-0.5"
                          }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Experimental */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Experimental
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Wake Word Detection</p>
              <p className="text-sm text-zinc-400">Say "Hey Pulse" to activate (coming soon)</p>
            </div>
            <button
              disabled
              className="w-12 h-6 rounded-full bg-zinc-700 opacity-50 cursor-not-allowed"
            >
              <div className="w-5 h-5 bg-white rounded-full translate-x-0.5" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

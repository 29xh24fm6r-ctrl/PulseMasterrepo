// Email Settings Page
// app/settings/email/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Settings, Mail } from "lucide-react";

export default function EmailSettingsPage() {
  const [taskMode, setTaskMode] = useState<"manual" | "assistive" | "auto">("manual");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/email/settings");
      const data = await res.json();
      if (res.ok && data.task_mode) {
        setTaskMode(data.task_mode);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_mode: taskMode }),
      });
      if (res.ok) {
        alert("Settings saved!");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Email Settings</h1>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Task Creation Mode
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Control how Pulse creates tasks from your emails
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors">
                <input
                  type="radio"
                  name="taskMode"
                  value="manual"
                  checked={taskMode === "manual"}
                  onChange={(e) => setTaskMode(e.target.value as any)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-white">Manual</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Review all task suggestions before they&apos;re created. You have full control.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors">
                <input
                  type="radio"
                  name="taskMode"
                  value="assistive"
                  checked={taskMode === "assistive"}
                  onChange={(e) => setTaskMode(e.target.value as any)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-white">Assistive</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Pulse auto-creates obvious tasks (high confidence), but still shows suggestions for uncertain ones.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors">
                <input
                  type="radio"
                  name="taskMode"
                  value="auto"
                  checked={taskMode === "auto"}
                  onChange={(e) => setTaskMode(e.target.value as any)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-white">Auto</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Pulse creates all confident tasks silently. You can still review and dismiss if needed.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


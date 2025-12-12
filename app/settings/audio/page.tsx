// Audio Settings Page
// app/settings/audio/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Settings, Mic } from "lucide-react";

interface AudioSettings {
  audio_capture_enabled: boolean;
  require_manual_start: boolean;
  auto_upload_meetings: boolean;
  delete_audio_after_transcription: boolean;
  mask_speaker_names: boolean;
}

export default function AudioSettingsPage() {
  const [settings, setSettings] = useState<AudioSettings>({
    audio_capture_enabled: false,
    require_manual_start: true,
    auto_upload_meetings: false,
    delete_audio_after_transcription: false,
    mask_speaker_names: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings/audio");
      const data = await res.json();
      if (res.ok && data) {
        setSettings(data);
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
      const res = await fetch("/api/settings/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
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

  function updateSetting(key: keyof AudioSettings, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
          <h1 className="text-2xl font-bold text-white">Audio Settings</h1>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Mic className="w-5 h-5 text-violet-400" />
              Audio Capture Settings
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Control how Pulse captures and processes audio recordings
            </p>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div>
                  <div className="font-medium text-white">Enable Audio Capture</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Allow Pulse to process audio recordings and extract responsibilities
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.audio_capture_enabled}
                  onChange={(e) => updateSetting("audio_capture_enabled", e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div>
                  <div className="font-medium text-white">Require Manual Start</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Always require explicit permission before starting recording
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.require_manual_start}
                  onChange={(e) => updateSetting("require_manual_start", e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div>
                  <div className="font-medium text-white">Auto-Upload Meeting Recordings</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Automatically process meeting recordings when detected
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_upload_meetings}
                  onChange={(e) => updateSetting("auto_upload_meetings", e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div>
                  <div className="font-medium text-white">Delete Audio After Transcription</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Remove raw audio files after transcript is generated (keeps transcript only)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.delete_audio_after_transcription}
                  onChange={(e) => updateSetting("delete_audio_after_transcription", e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div>
                  <div className="font-medium text-white">Mask Speaker Names</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Replace speaker names with generic labels in transcripts
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.mask_speaker_names}
                  onChange={(e) => updateSetting("mask_speaker_names", e.target.checked)}
                  className="w-5 h-5"
                />
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


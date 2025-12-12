// Voice Identity Settings Page
// app/settings/voice-identity/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Settings, Mic, User, X } from "lucide-react";

interface VoiceIdentitySettings {
  speaker_identification_enabled: boolean;
  auto_identify_threshold: number;
  require_consent: boolean;
}

interface VoiceProfile {
  id: string;
  contact_name: string | null;
  contact_id: string | null;
  created_at: string;
}

interface UnknownSpeaker {
  id: string;
  label: string | null;
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
}

export default function VoiceIdentitySettingsPage() {
  const [settings, setSettings] = useState<VoiceIdentitySettings>({
    speaker_identification_enabled: true,
    auto_identify_threshold: 0.85,
    require_consent: true,
  });
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [unknownSpeakers, setUnknownSpeakers] = useState<UnknownSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [settingsRes, profilesRes, unknownRes] = await Promise.all([
        fetch("/api/settings/voice-identity"),
        fetch("/api/voice/identity/profiles"),
        fetch("/api/voice/identity/unknown"),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData || settings);
      }

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        setProfiles(profilesData || []);
      }

      if (unknownRes.ok) {
        const unknownData = await unknownRes.json();
        setUnknownSpeakers(unknownData || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/voice-identity", {
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

  async function deleteProfile(profileId: string) {
    if (!confirm("Delete this voice profile?")) return;
    try {
      const res = await fetch(`/api/voice/identity/profiles/${profileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to delete profile:", err);
    }
  }

  async function deleteUnknown(unknownId: string) {
    if (!confirm("Delete this unknown speaker?")) return;
    try {
      const res = await fetch(`/api/voice/identity/unknown/${unknownId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to delete unknown speaker:", err);
    }
  }

  function updateSetting(key: keyof VoiceIdentitySettings, value: boolean | number) {
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Voice Identity Settings</h1>
        </div>

        {/* Settings */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-violet-400" />
            Speaker Identification
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-colors">
              <div>
                <div className="font-medium text-white">Enable Speaker Identification</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Automatically detect and identify speakers in audio recordings
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.speaker_identification_enabled}
                onChange={(e) => updateSetting("speaker_identification_enabled", e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-colors">
              <div>
                <div className="font-medium text-white">Auto-Identify Threshold</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Confidence level required to auto-identify a known speaker (0.0 - 1.0)
                </div>
              </div>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={settings.auto_identify_threshold}
                onChange={(e) => updateSetting("auto_identify_threshold", parseFloat(e.target.value))}
                className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white"
              />
            </label>

            <label className="flex items-center justify-between p-4 border border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-colors">
              <div>
                <div className="font-medium text-white">Require Consent</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Ask for user confirmation before identifying speakers
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.require_consent}
                onChange={(e) => updateSetting("require_consent", e.target.checked)}
                className="w-5 h-5"
              />
            </label>
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

        {/* Known Voice Profiles */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Known Voice Profiles ({profiles.length})
          </h2>
          {profiles.length === 0 ? (
            <div className="text-sm text-zinc-400">No known voice profiles yet.</div>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 border border-zinc-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">
                      {profile.contact_name || "Unnamed Contact"}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Created: {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteProfile(profile.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unknown Speakers */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-zinc-400" />
            Unknown Speakers ({unknownSpeakers.length})
          </h2>
          {unknownSpeakers.length === 0 ? (
            <div className="text-sm text-zinc-400">No unknown speakers detected.</div>
          ) : (
            <div className="space-y-2">
              {unknownSpeakers.map((unknown) => (
                <div
                  key={unknown.id}
                  className="flex items-center justify-between p-3 border border-zinc-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">{unknown.label || "Unknown"}</div>
                    <div className="text-xs text-zinc-400">
                      Seen {unknown.occurrence_count} time{unknown.occurrence_count > 1 ? "s" : ""} · Last:{" "}
                      {new Date(unknown.last_seen).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteUnknown(unknown.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


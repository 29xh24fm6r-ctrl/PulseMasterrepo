// Autopilot Settings Page
// app/settings/autopilot/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Save, Settings } from "lucide-react";
import { AutopilotPolicy, AutopilotActionType } from "@/lib/autopilot/types";

export default function AutopilotSettingsPage() {
  const [policy, setPolicy] = useState<AutopilotPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, []);

  async function loadPolicy() {
    try {
      const res = await fetch("/api/autopilot/policy");
      const json = await res.json();
      if (res.ok) {
        setPolicy(json);
      }
    } catch (err) {
      console.error("Failed to load policy:", err);
    } finally {
      setLoading(false);
    }
  }

  async function savePolicy() {
    if (!policy) return;

    setSaving(true);
    try {
      const res = await fetch("/api/autopilot/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      if (res.ok) {
        alert("Settings saved!");
      }
    } catch (err) {
      console.error("Failed to save policy:", err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const actionTypes: AutopilotActionType[] = [
    "email_followup",
    "create_task",
    "complete_task",
    "relationship_checkin",
    "deal_nudge",
    "meeting_prep",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading settings...</div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-violet-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Autopilot Settings</h1>
            <p className="text-sm text-zinc-400">
              Configure how Pulse automatically suggests and executes actions
            </p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Mode</h2>
          <div className="space-y-2">
            {(["off", "shadow", "assist", "auto"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value={mode}
                  checked={policy.mode === mode}
                  onChange={() => setPolicy({ ...policy, mode })}
                  className="w-4 h-4 text-violet-600"
                />
                <div>
                  <div className="text-white capitalize">{mode}</div>
                  <div className="text-xs text-zinc-400">
                    {mode === "off" && "Autopilot disabled"}
                    {mode === "shadow" && "Detect and log only, no actions"}
                    {mode === "assist" && "Suggest actions, require approval"}
                    {mode === "auto" && "Execute low-risk actions automatically"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Types */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Enabled Action Types</h2>
          <div className="space-y-2">
            {actionTypes.map((type) => (
              <label key={type} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.enabled_action_types.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setPolicy({
                        ...policy,
                        enabled_action_types: [...policy.enabled_action_types, type],
                      });
                    } else {
                      setPolicy({
                        ...policy,
                        enabled_action_types: policy.enabled_action_types.filter(
                          (t) => t !== type
                        ),
                      });
                    }
                  }}
                  className="w-4 h-4 text-violet-600"
                />
                <span className="text-white capitalize">
                  {type.replace(/_/g, " ")}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Daily Limit */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Daily Action Limit</h2>
          <input
            type="number"
            min="1"
            max="100"
            value={policy.daily_action_limit}
            onChange={(e) =>
              setPolicy({ ...policy, daily_action_limit: parseInt(e.target.value) || 10 })
            }
            className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
          />
          <p className="text-xs text-zinc-400">
            Maximum number of actions per day
          </p>
        </div>

        {/* Risk Level */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Maximum Risk Level</h2>
          <div className="space-y-2">
            {(["low", "medium", "high"] as const).map((risk) => (
              <label key={risk} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="max_risk"
                  value={risk}
                  checked={policy.max_risk_level === risk}
                  onChange={() => setPolicy({ ...policy, max_risk_level: risk })}
                  className="w-4 h-4 text-violet-600"
                />
                <span className="text-white capitalize">{risk}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Quiet Hours</h2>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Start</label>
              <input
                type="time"
                value={policy.quiet_hours_start || ""}
                onChange={(e) =>
                  setPolicy({ ...policy, quiet_hours_start: e.target.value || null })
                }
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">End</label>
              <input
                type="time"
                value={policy.quiet_hours_end || ""}
                onChange={(e) =>
                  setPolicy({ ...policy, quiet_hours_end: e.target.value || null })
                }
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
              />
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Autopilot will not suggest actions during these hours
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={savePolicy}
            disabled={saving}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}





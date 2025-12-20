// AGI Settings Page
// app/(authenticated)/settings/agi/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2 } from "lucide-react";
import type { AGIUserProfile } from "@/types/agi";

export default function AGISettingsPage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<AGIUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch("/api/agi/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error("Failed to load AGI profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;

    setSaving(true);
    try {
      const res = await fetch("/api/agi/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        alert("AGI settings saved!");
      } else {
        alert("Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <AppCard className="p-6 text-center">
          <p className="text-white/70">Failed to load AGI settings</p>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AGI Settings</h1>
          <p className="text-white/70 mt-1">Configure how Pulse's AGI works for you</p>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Autonomy Style */}
      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Autonomy Style</h2>
        <p className="text-sm text-white/60 mb-4">
          How proactive should AGI be? (This is separate from the global AGI level in main settings)
        </p>
        <div className="flex gap-3">
          {(["conservative", "balanced", "proactive"] as const).map((style) => (
            <button
              key={style}
              onClick={() => setProfile({ ...profile, autonomyStyle: style })}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                profile.autonomyStyle === style
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
              }`}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </AppCard>

      {/* Focus Areas / Priorities */}
      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Focus Areas</h2>
        <p className="text-sm text-white/60 mb-4">Which life domains should AGI prioritize?</p>
        <div className="space-y-2">
          {[
            { key: "work", label: "Work / Deals" },
            { key: "finance", label: "Finance" },
            { key: "relationships", label: "Relationships" },
            { key: "health", label: "Health" },
            { key: "personal_growth", label: "Personal Growth" },
          ].map((area) => (
            <label key={area.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.priorities[area.key] || false}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    priorities: { ...profile.priorities, [area.key]: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
              />
              <span className="text-white">{area.label}</span>
            </label>
          ))}
        </div>
      </AppCard>

      {/* Capabilities */}
      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Capabilities</h2>
        <p className="text-sm text-white/60 mb-4">What is AGI allowed to do?</p>
        <div className="space-y-2">
          {[
            { key: "create_tasks", label: "Create tasks" },
            { key: "reorder_tasks", label: "Reorder tasks" },
            { key: "calendar_blocks", label: "Suggest calendar blocks" },
            { key: "draft_emails", label: "Draft emails" },
            { key: "run_simulations", label: "Run simulations" },
            { key: "update_crm", label: "Update CRM fields" },
          ].map((cap) => (
            <label key={cap.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.capabilities[cap.key] || false}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    capabilities: { ...profile.capabilities, [cap.key]: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
              />
              <span className="text-white">{cap.label}</span>
            </label>
          ))}
        </div>
      </AppCard>

      {/* Hard Limits */}
      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Hard Limits</h2>
        <p className="text-sm text-white/60 mb-4">Absolute safety constraints</p>
        <div className="space-y-2">
          {[
            { key: "no_email_send", label: "Never send emails on my behalf" },
            { key: "no_calendar_changes", label: "Never change my calendar" },
            { key: "no_financial_moves", label: "Never suggest financial moves" },
            { key: "no_relationship_nudges", label: "Never nudge about relationships" },
          ].map((limit) => (
            <label key={limit.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.hardLimits[limit.key] || false}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    hardLimits: { ...profile.hardLimits, [limit.key]: e.target.checked },
                  })
                }
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
              />
              <span className="text-white">{limit.label}</span>
            </label>
          ))}
        </div>
      </AppCard>

      {/* Tone / Persona */}
      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Tone / Persona</h2>
        <p className="text-sm text-white/60 mb-4">How should AGI communicate with you?</p>
        <select
          value={profile.tone}
          onChange={(e) => setProfile({ ...profile, tone: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white"
        >
          <option value="default">Default</option>
          <option value="calm">Calm</option>
          <option value="hype">Hype Coach</option>
          <option value="stoic">Stoic</option>
          <option value="strategist">Strategic Advisor</option>
        </select>
      </AppCard>

      {/* Notifications */}
      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Notifications</h2>
        <div className="space-y-2">
          {[
            { key: "in_app", label: "In-app notifications" },
            { key: "email", label: "Email digests" },
            { key: "sms", label: "SMS (future)" },
          ].map((notif) => (
            <label key={notif.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.notificationPreferences[notif.key] || false}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    notificationPreferences: {
                      ...profile.notificationPreferences,
                      [notif.key]: e.target.checked,
                    },
                  })
                }
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
              />
              <span className="text-white">{notif.label}</span>
            </label>
          ))}
        </div>
      </AppCard>

      {/* Predictive Assistance */}
      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Predictive Assistance</h2>
        <p className="text-sm text-white/60 mb-4">
          Should AGI provide forward-looking suggestions and predictions?
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.predictiveAssistance}
            onChange={(e) => setProfile({ ...profile, predictiveAssistance: e.target.checked })}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600"
          />
          <span className="text-white">Enable predictive assistance</span>
        </label>
      </AppCard>
    </div>
  );
}




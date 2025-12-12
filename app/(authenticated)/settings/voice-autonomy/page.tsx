// Voice Autonomy Settings
// app/(authenticated)/settings/voice-autonomy/page.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVoiceAutonomyStore } from "@/app/state/voice-autonomy-store";
import { VoicePersonaKey } from "@/lib/voice/autonomy/types";
import { Volume2, VolumeX, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const PERSONA_OPTIONS: Array<{ key: VoicePersonaKey; name: string; description: string }> = [
  { key: "calm", name: "Calm", description: "Gentle, supportive voice" },
  { key: "hype", name: "Hype", description: "Energetic, motivational voice" },
  { key: "command", name: "Command", description: "Direct, authoritative voice" },
  { key: "warm_advisor", name: "Warm Advisor", description: "Caring, thoughtful voice" },
  { key: "strategic", name: "Strategic", description: "Analytical, clear voice" },
  { key: "motivational", name: "Motivational", description: "Encouraging, uplifting voice" },
  { key: "confidant", name: "Confidant", description: "Empathetic, understanding voice" },
];

export default function VoiceAutonomySettingsPage() {
  const {
    isLiveModeEnabled,
    setLiveMode,
    personaPreference,
    setPersonaPreference,
    lastIntervention,
    getCooldownRemaining,
  } = useVoiceAutonomyStore();

  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    // Update cooldowns every second
    const interval = setInterval(() => {
      const triggers = [
        "burnout_detected",
        "relationship_opportunity",
        "upcoming_meeting",
        "task_avoidance",
        "high_momentum",
        "life_chapter_transition",
        "financial_risk_window",
        "habit_streak_break",
        "emotion_spike",
        "autonomy_action_urgent",
      ];

      const newCooldowns: Record<string, number> = {};
      triggers.forEach((trigger) => {
        newCooldowns[trigger] = getCooldownRemaining(trigger);
      });
      setCooldowns(newCooldowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [getCooldownRemaining]);

  return (
    <main className="flex flex-col gap-4 p-4 lg:p-6 max-w-4xl mx-auto">
      <header className="mb-2">
        <h1 className="text-3xl font-bold text-white mb-1">Voice Autonomy Settings</h1>
        <p className="text-sm text-zinc-400">
          Configure Pulse's proactive voice interventions
        </p>
      </header>

      {/* Live Mode Toggle */}
      <AppCard title="Live Butler Mode" description="Enable proactive voice interventions">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white mb-1">
              {isLiveModeEnabled ? "Live Mode Active" : "Live Mode Disabled"}
            </div>
            <div className="text-xs text-zinc-400">
              {isLiveModeEnabled
                ? "Pulse will speak proactively when important events occur"
                : "Pulse will only speak when you ask"}
            </div>
          </div>
          <Button
            onClick={() => setLiveMode(!isLiveModeEnabled)}
            variant={isLiveModeEnabled ? "default" : "outline"}
            className={cn(
              "flex items-center gap-2",
              isLiveModeEnabled && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isLiveModeEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                Enabled
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                Disabled
              </>
            )}
          </Button>
        </div>
      </AppCard>

      {/* Persona Preference */}
      <AppCard title="Preferred Voice Persona" description="Default voice style for interventions">
        <div className="grid gap-2">
          {PERSONA_OPTIONS.map((persona) => (
            <button
              key={persona.key}
              onClick={() => setPersonaPreference(persona.key)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                personaPreference === persona.key
                  ? "bg-violet-500/20 border-violet-500/50"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{persona.name}</div>
                  <div className="text-xs text-zinc-400">{persona.description}</div>
                </div>
                {personaPreference === persona.key && (
                  <Badge variant="outline" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </AppCard>

      {/* Last Intervention */}
      {lastIntervention && (
        <AppCard title="Last Intervention" description="Most recent voice intervention">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Trigger</span>
              <Badge variant="outline" className="text-xs">
                {lastIntervention.trigger}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Persona</span>
              <span className="text-sm text-white">{lastIntervention.personaKey}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Urgency</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  lastIntervention.urgency === "high" && "border-red-500/50 text-red-400",
                  lastIntervention.urgency === "medium" && "border-yellow-500/50 text-yellow-400"
                )}
              >
                {lastIntervention.urgency}
              </Badge>
            </div>
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Message</div>
              <div className="text-sm text-white">{lastIntervention.message}</div>
            </div>
            <div className="text-xs text-zinc-500">
              {new Date(lastIntervention.timestamp).toLocaleString()}
            </div>
          </div>
        </AppCard>
      )}

      {/* Trigger Cooldowns */}
      <AppCard title="Trigger Cooldowns" description="Time remaining before triggers can fire again">
        <div className="space-y-2">
          {Object.entries(cooldowns).map(([trigger, seconds]) => (
            <div key={trigger} className="flex items-center justify-between">
              <span className="text-sm text-zinc-400 capitalize">
                {trigger.replace(/_/g, " ")}
              </span>
              {seconds > 0 ? (
                <span className="text-xs text-zinc-500">
                  {Math.floor(seconds / 60)}m {seconds % 60}s
                </span>
              ) : (
                <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                  Ready
                </Badge>
              )}
            </div>
          ))}
        </div>
      </AppCard>
    </main>
  );
}




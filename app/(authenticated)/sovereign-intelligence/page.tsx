// Sovereign Intelligence Panel
// app/(authenticated)/sovereign-intelligence/page.tsx

"use client";

import { useState, useEffect } from "react";
import { BehaviorProfile } from "@/lib/cortex/sovereign/sovereign-intelligence/types";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SovereignIntelligencePage() {
  const [profile, setProfile] = useState<BehaviorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/sovereign-intelligence/profile");
      if (res.ok) {
        const profileData = await res.json();
        setProfile(profileData);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function runUpdate() {
    setUpdating(true);
    try {
      const res = await fetch("/api/sovereign-intelligence/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update" }),
      });
      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile(updatedProfile);
      }
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setUpdating(false);
    }
  }

  async function resetField(field: keyof BehaviorProfile, value: any) {
    try {
      const res = await fetch("/api/sovereign-intelligence/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", field, value }),
      });
      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile(updatedProfile);
      }
    } catch (err) {
      console.error("Failed to reset:", err);
    }
  }

  if (loading) {
    return <LoadingState message="Loading Sovereign Intelligence..." />;
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400">
        Failed to load behavior profile
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-4 p-4 lg:p-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Sovereign Intelligence</h1>
          <p className="text-sm text-zinc-400">
            How Pulse learns and adapts to help you better
          </p>
        </div>
        <Button onClick={runUpdate} disabled={updating} className="flex items-center gap-2">
          <RefreshCw className={cn("w-4 h-4", updating && "animate-spin")} />
          Run Update
        </Button>
      </header>

      {/* Behavior Profile */}
      <AppCard title="Behavior Profile" description={`Version ${profile.version}`}>
        <div className="space-y-4">
          {/* Push Intensity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Push Intensity</span>
              <Badge variant="outline" className="text-xs capitalize">
                {profile.pushIntensity}
              </Badge>
            </div>
            <div className="text-xs text-zinc-400 mb-2">
              How assertively Pulse suggests actions
            </div>
            <div className="flex gap-2">
              {(["gentle", "balanced", "assertive"] as const).map((level) => (
                <Button
                  key={level}
                  variant={profile.pushIntensity === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => resetField("pushIntensity", level)}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Autonomy Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Autonomy Level</span>
              <Badge variant="outline" className="text-xs capitalize">
                {profile.autonomyLevel}
              </Badge>
            </div>
            <div className="text-xs text-zinc-400 mb-2">
              How much Pulse acts proactively
            </div>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((level) => (
                <Button
                  key={level}
                  variant={profile.autonomyLevel === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => resetField("autonomyLevel", level)}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Guidance Style */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Guidance Style</span>
              <Badge variant="outline" className="text-xs capitalize">
                {profile.guidanceStyle}
              </Badge>
            </div>
            <div className="text-xs text-zinc-400 mb-2">
              How Pulse communicates with you
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["coaching", "advisory", "directive", "reflective"] as const).map((style) => (
                <Button
                  key={style}
                  variant={profile.guidanceStyle === style ? "default" : "outline"}
                  size="sm"
                  onClick={() => resetField("guidanceStyle", style)}
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

          {/* Domain Weights */}
          <div>
            <div className="text-sm font-semibold text-white mb-2">Domain Weights</div>
            <div className="text-xs text-zinc-400 mb-2">
              How Pulse prioritizes different life domains
            </div>
            <div className="space-y-2">
              {Object.entries(profile.domainWeights).map(([domain, weight]) => (
                <div key={domain} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 capitalize w-24">{domain}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 transition-all"
                      style={{ width: `${weight * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-12 text-right">
                    {Math.round(weight * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Tolerance & Change Speed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-semibold text-white mb-2">Risk Tolerance</div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${profile.riskTolerance * 100}%` }}
                />
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {Math.round(profile.riskTolerance * 100)}%
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-white mb-2">Change Speed</div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${profile.changeSpeed * 100}%` }}
                />
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {Math.round(profile.changeSpeed * 100)}%
              </div>
            </div>
          </div>

          {/* Last Update Reason */}
          {profile.lastUpdateReason && (
            <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Last Update Reason</div>
              <div className="text-sm text-white">{profile.lastUpdateReason}</div>
            </div>
          )}
        </div>
      </AppCard>
    </main>
  );
}




// Pulse Meta-OS Settings - Experience v12
// app/(authenticated)/metaos/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { MetaOSProfile } from "@/lib/metaos/engine";
import { RefreshCw, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MetaOSPage() {
  const [profile, setProfile] = useState<MetaOSProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/metaos/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function rebuildOS() {
    setRebuilding(true);
    try {
      const res = await fetch("/api/metaos/rebuild", { method: "POST" });
      if (res.ok) {
        await loadProfile();
      }
    } catch (err) {
      console.error("Failed to rebuild OS:", err);
    } finally {
      setRebuilding(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading Meta-OS profile..." />;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Pulse Meta-OS</h1>
          <p className="text-sm text-text-secondary">
            Self-evolving meta-system that adapts to you
          </p>
        </div>
        <Button onClick={rebuildOS} disabled={rebuilding}>
          <RefreshCw className={cn("w-4 h-4 mr-2", rebuilding && "animate-spin")} />
          {rebuilding ? "Rebuilding..." : "Rebuild OS"}
        </Button>
      </div>

      {profile ? (
        <div className="grid gap-6 md:grid-cols-2">
          <AppCard title="Preferred OS Styles" description="How you like your OS structured">
            <div className="space-y-2">
              {profile.preferredOSStyles.map((style, i) => (
                <div
                  key={i}
                  className="p-2 bg-surface3 rounded border border-border-default text-sm text-text-primary"
                >
                  {style}
                </div>
              ))}
            </div>
          </AppCard>

          <AppCard title="Preferred Coach Modes" description="Which coach styles you engage with">
            <div className="space-y-2">
              {profile.preferredCoachModes.map((mode, i) => (
                <div
                  key={i}
                  className="p-2 bg-surface3 rounded border border-border-default text-sm text-text-primary"
                >
                  {mode}
                </div>
              ))}
            </div>
          </AppCard>

          <AppCard title="Preferred Experience Modes" description="How you interact with Pulse">
            <div className="space-y-2">
              {profile.preferredExperienceModes.map((mode, i) => (
                <div
                  key={i}
                  className="p-2 bg-surface3 rounded border border-border-default text-sm text-text-primary"
                >
                  {mode}
                </div>
              ))}
            </div>
          </AppCard>

          <AppCard title="Auto Adjustments" description="Allow Pulse to redesign itself">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">Automatic Redesign</span>
                <input
                  type="checkbox"
                  checked={profile.autoAdjustmentsEnabled}
                  readOnly
                  className="w-4 h-4"
                />
              </div>
              <div className="text-xs text-text-secondary">
                When enabled, Pulse will automatically adjust its UI, coaches, routines, and
                workflows based on your usage patterns.
              </div>
            </div>
          </AppCard>
        </div>
      ) : (
        <AppCard title="No Meta Profile Yet" description="Generate your Meta-OS profile">
          <Button onClick={rebuildOS} disabled={rebuilding} className="mt-4">
            Generate Meta-OS Profile
          </Button>
        </AppCard>
      )}
    </div>
  );
}




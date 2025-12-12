// Pulse Canvas - Dynamic Living Dashboard
// app/(authenticated)/canvas/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import { getEmotionTheme } from "@/lib/ui/emotion-theme";
import {
  Brain,
  Zap,
  Target,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasData {
  emotion: {
    detected: string;
    intensity: number;
  };
  energy: number;
  identityMode: string;
  frictionScore: number;
  priorities: Array<{ id: string; title: string; description?: string }>;
  butlerSuggestions: Array<{ id: string; title: string; description?: string }>;
  relationshipTouches: Array<{
    id: string;
    name: string;
    strength: number;
    nextAction: string;
  }>;
  microSteps: Array<{ id: string; title: string; estimatedMinutes: number }>;
}

export default function PulseCanvasPage() {
  const [data, setData] = useState<CanvasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cortexActivity, setCortexActivity] = useState(0.5);

  useEffect(() => {
    loadCanvasData();
    // Simulate Cortex activity
    const interval = setInterval(() => {
      setCortexActivity(Math.random() * 0.5 + 0.3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadCanvasData() {
    setLoading(true);
    try {
      const res = await fetch("/api/cortex/context");
      if (res.ok) {
        const ctx = await res.json();
        // Transform context into canvas data
        const priorities = ctx.domains?.strategy?.currentQuarterFocus?.bigThree || [
          { id: "1", title: "Focus on high-impact work" },
          { id: "2", title: "Strengthen key relationships" },
          { id: "3", title: "Maintain energy balance" },
        ];

        const relationshipTouches = (ctx.domains?.relationships?.keyPeople || [])
          .slice(0, 3)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            strength: p.relationshipScore,
            nextAction: p.daysSinceInteraction > 30 ? "Reconnect" : "Maintain",
          }));

        setData({
          emotion: {
            detected: ctx.emotion?.detected_emotion || "neutral",
            intensity: ctx.emotion?.intensity || 0.5,
          },
          energy: ctx.cognitiveProfile?.currentEnergyLevel || 0.5,
          identityMode: "strategist", // Would come from identity profile
          frictionScore: 0.3,
          priorities,
          butlerSuggestions: [
            { id: "1", title: "Review weekly plan", description: "Your plan is ready" },
            { id: "2", title: "Check relationship opportunities", description: "3 people need attention" },
          ],
          relationshipTouches,
          microSteps: [
            { id: "1", title: "Review email", estimatedMinutes: 15 },
            { id: "2", title: "Plan tomorrow", estimatedMinutes: 10 },
          ],
        });
      }
    } catch (err) {
      console.error("Failed to load canvas data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Building your canvas..." />;
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400">
        Failed to load canvas data
      </div>
    );
  }

  const theme = getEmotionTheme(data.emotion.detected, data.emotion.intensity);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Pulse Bar */}
      <motion.div
        className="fixed top-0 left-20 right-0 h-1 bg-surface2 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple"
          style={{
            width: `${cortexActivity * 100}%`,
            opacity: cortexActivity,
          }}
          animate={{
            opacity: [cortexActivity, cortexActivity + 0.2, cortexActivity],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Today's State Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AppCard
          title="Today's State"
          description={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-surface3 rounded-lg border border-border-default">
              <div className="text-xs text-text-secondary mb-1">Emotion</div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <span className="text-sm font-semibold text-text-primary capitalize">
                  {data.emotion.detected}
                </span>
              </div>
            </div>
            <div className="p-4 bg-surface3 rounded-lg border border-border-default">
              <div className="text-xs text-text-secondary mb-1">Energy</div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent-cyan" />
                <span className="text-sm font-semibold text-text-primary">
                  {Math.round(data.energy * 100)}%
                </span>
              </div>
            </div>
            <div className="p-4 bg-surface3 rounded-lg border border-border-default">
              <div className="text-xs text-text-secondary mb-1">Identity</div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-accent-purple" />
                <span className="text-sm font-semibold text-text-primary capitalize">
                  {data.identityMode}
                </span>
              </div>
            </div>
            <div className="p-4 bg-surface3 rounded-lg border border-border-default">
              <div className="text-xs text-text-secondary mb-1">Friction</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-warning transition-all"
                    style={{ width: `${data.frictionScore * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary">
                  {Math.round(data.frictionScore * 100)}%
                </span>
              </div>
            </div>
          </div>
        </AppCard>
      </motion.div>

      {/* Today's 3 Priorities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <AppCard title="Today's Priorities" description="Your Big Three">
          <div className="space-y-3">
            {data.priorities.map((priority, i) => (
              <motion.div
                key={priority.id}
                className="p-4 bg-gradient-to-r from-accent-blue/20 to-accent-purple/20 rounded-lg border border-accent-blue/30"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-white font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-text-primary">
                      {priority.title}
                    </div>
                    {priority.description && (
                      <div className="text-xs text-text-secondary mt-1">
                        {priority.description}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AppCard>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Butler Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AppCard
            title="Butler Suggestions"
            description="Cortex-driven recommendations"
          >
            <div className="space-y-2">
              {data.butlerSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 bg-surface3 rounded-lg border border-border-default hover:border-border-hover transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-accent-cyan" />
                    <span className="text-sm font-medium text-text-primary">
                      {suggestion.title}
                    </span>
                  </div>
                  {suggestion.description && (
                    <div className="text-xs text-text-secondary">
                      {suggestion.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>

        {/* Relationship Touches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AppCard
            title="Relationship Touches"
            description={`${data.relationshipTouches.length} people need attention`}
          >
            <div className="space-y-2">
              {data.relationshipTouches.map((touch) => (
                <div
                  key={touch.id}
                  className="p-3 bg-surface3 rounded-lg border border-border-default"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      {touch.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(touch.strength)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary">{touch.nextAction}</div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>

        {/* Micro-Steps Queue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="md:col-span-2"
        >
          <AppCard
            title="Micro-Steps Queue"
            description="EF v3 generated steps (time-sliced)"
          >
            <div className="grid gap-2 md:grid-cols-3">
              {data.microSteps.map((step) => (
                <div
                  key={step.id}
                  className="p-3 bg-surface3 rounded-lg border border-border-default"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-primary">{step.title}</span>
                    <div className="flex items-center gap-1 text-xs text-text-secondary">
                      <Clock className="w-3 h-3" />
                      {step.estimatedMinutes}m
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>
      </div>
    </div>
  );
}




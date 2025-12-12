// Work Dashboard v2 - Vertical Slice Experience
// app/(authenticated)/work/v2/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import { ButlerPanel } from "@/app/components/butler/ButlerPanel";
import { generateTimeSlices } from "@/lib/time-slicing/v1/tse";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import {
  Briefcase,
  Clock,
  TrendingUp,
  Users,
  Zap,
  Target,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkDashboardData {
  briefing: {
    message: string;
    energyAdjustedPlan: string;
  };
  timeline: Array<{
    time: string;
    domain: string;
    task: string;
    intensity: number;
  }>;
  projects: Array<{
    id: string;
    name: string;
    progress: number;
    momentum: "rising" | "stable" | "declining";
    nextMilestone: string;
  }>;
  workContacts: Array<{
    id: string;
    name: string;
    relationshipScore: number;
    action: string;
  }>;
}

export default function WorkDashboardV2Page() {
  const [data, setData] = useState<WorkDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showButler, setShowButler] = useState(false);

  useEffect(() => {
    loadWorkData();
  }, []);

  async function loadWorkData() {
    setLoading(true);
    try {
      const ctx = await buildPulseCortexContext("user_123"); // Would get from auth

      // Generate time slices
      const timeSlices = generateTimeSlices(ctx);

      // Build briefing
      const energy = ctx.cognitiveProfile?.currentEnergyLevel || 0.5;
      const emotion = ctx.emotion?.detected_emotion || "neutral";
      const briefing = {
        message: `Here's what matters today. Your energy is at ${Math.round(energy * 100)}% and you're feeling ${emotion}.`,
        energyAdjustedPlan: energy > 0.7
          ? "High energy - perfect for deep work and important projects"
          : energy > 0.4
          ? "Moderate energy - focus on medium-complexity tasks"
          : "Low energy - prioritize light tasks and recovery",
      };

      // Build timeline from time slices
      const timeline = timeSlices
        .filter((slice) => slice.domain === "work")
        .map((slice) => ({
          time: new Date(slice.start).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
          domain: slice.domain,
          task: slice.description || "Work block",
          intensity: slice.intensity,
        }));

      // Build projects
      const projects = (ctx.domains.work?.activeProjects || []).map((project: any) => ({
        id: project.id,
        name: project.name,
        progress: project.progress || 0,
        momentum: project.progress > 0.5 ? "rising" : "stable",
        nextMilestone: project.nextMilestone || "Continue progress",
      }));

      // Build work contacts
      const relationships = ctx.domains.relationships?.keyPeople || [];
      const workContacts = relationships
        .filter((p) => p.relationshipScore > 60)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          relationshipScore: p.relationshipScore,
          action: p.daysSinceInteraction > 7 ? "Touch base" : "Maintain",
        }));

      setData({
        briefing,
        timeline,
        projects,
        workContacts,
      });
    } catch (err) {
      console.error("Failed to load work data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading your work dashboard..." />;
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400">
        Failed to load work data
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Butler Work Briefing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AppCard
          title="Butler Work Briefing"
          description="Here's what matters today"
        >
          <div className="space-y-3">
            <div className="p-4 bg-surface3 rounded-lg border border-border-default">
              <div className="text-sm text-text-primary">{data.briefing.message}</div>
            </div>
            <div className="p-4 bg-accent-blue/10 rounded-lg border border-accent-blue/30">
              <div className="text-xs text-text-secondary mb-1">Energy-Adjusted Plan</div>
              <div className="text-sm text-text-primary">{data.briefing.energyAdjustedPlan}</div>
            </div>
            <button
              onClick={() => setShowButler(true)}
              className="w-full p-3 bg-accent-cyan/10 rounded-lg border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
            >
              Open Butler Panel
            </button>
          </div>
        </AppCard>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Work Timeline */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AppCard title="Work Timeline" description="Time-sliced schedule">
            <div className="space-y-3">
              {data.timeline.map((block, i) => (
                <div
                  key={i}
                  className="p-3 bg-surface3 rounded-lg border border-border-default"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-secondary" />
                      <span className="text-sm font-semibold text-text-primary">{block.time}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        block.intensity > 0.7 && "border-accent-cyan/50 text-accent-cyan"
                      )}
                    >
                      {block.intensity > 0.7 ? "High" : block.intensity > 0.4 ? "Medium" : "Low"}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary">{block.task}</div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>

        {/* Project Cards */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AppCard title="Active Projects" description="Momentum indicators">
            <div className="space-y-3">
              {data.projects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 bg-surface3 rounded-lg border border-border-default"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary">{project.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        project.momentum === "rising" && "border-green-500/50 text-green-400",
                        project.momentum === "declining" && "border-red-500/50 text-red-400"
                      )}
                    >
                      {project.momentum}
                    </Badge>
                  </div>
                  <div className="h-2 bg-surface2 rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full bg-accent-blue transition-all"
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="text-xs text-text-secondary">{project.nextMilestone}</div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>

        {/* Work Contacts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-2"
        >
          <AppCard
            title="Relationship-Relevant Work Contacts"
            description="People you need to touch today"
          >
            <div className="grid gap-3 md:grid-cols-3">
              {data.workContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 bg-surface3 rounded-lg border border-border-default"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {contact.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(contact.relationshipScore)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary">{contact.action}</div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>
      </div>

      {showButler && (
        <ButlerPanel
          onClose={() => setShowButler(false)}
          persona="strategic"
          recentReasoning="Analyzing work patterns and energy levels to optimize your day"
          suggestedActions={[
            { id: "1", title: "Focus on high-priority project", description: "Energy is optimal" },
            { id: "2", title: "Schedule deep work block", description: "2:00 PM - 4:00 PM" },
          ]}
        />
      )}
    </div>
  );
}




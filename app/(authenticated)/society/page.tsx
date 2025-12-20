// Societal Dashboard - Experience v7
// app/(authenticated)/society/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import type { SocietalInsight } from "@/lib/societal/types";
import { Users, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CohortData {
  archetype: {
    code: string;
    name: string;
    description: string;
    strengths: string[];
    risks: string[];
    recommended_protocols: string[];
  };
  confidence: number;
}

export default function SocietyPage() {
  const [cohort, setCohort] = useState<CohortData | null>(null);
  const [insights, setInsights] = useState<SocietalInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSocietalData();
  }, []);

  async function loadSocietalData() {
    setLoading(true);
    try {
      // Load cohort
      const cohortRes = await fetch("/api/society/cohort");
      if (cohortRes.ok) {
        const cohortData = await cohortRes.json();
        setCohort(cohortData.cohort);
      }

      // Load insights
      const insightsRes = await fetch("/api/society/insights");
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData.insights || []);
      }
    } catch (err) {
      console.error("Failed to load societal data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading societal insights..." />;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Societal Layer</h1>
        <p className="text-sm text-text-secondary">
          Collective intelligence and archetype insights
        </p>
      </div>

      {cohort ? (
        <>
          {/* Your Archetype */}
          <AppCard title="Your Archetype" description={cohort.archetype.description}>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-semibold text-text-primary mb-2">
                  {cohort.archetype.name}
                </div>
                <div className="text-sm text-text-secondary">
                  Confidence: {Math.round(cohort.confidence * 100)}%
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-text-primary mb-2">Strengths</div>
                  <div className="space-y-1">
                    {cohort.archetype.strengths.map((strength, i) => (
                      <div
                        key={i}
                        className="p-2 bg-green-500/10 rounded border border-green-500/30 text-sm text-text-primary"
                      >
                        {strength}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-text-primary mb-2">Risks</div>
                  <div className="space-y-1">
                    {cohort.archetype.risks.map((risk, i) => (
                      <div
                        key={i}
                        className="p-2 bg-red-500/10 rounded border border-red-500/30 text-sm text-text-primary"
                      >
                        {risk}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AppCard>

          {/* Recommended Protocols */}
          <AppCard title="Recommended Protocols" description="Archetype-specific practices">
            <div className="space-y-2">
              {cohort.archetype.recommended_protocols.map((protocol, i) => (
                <div
                  key={i}
                  className="p-3 bg-surface3 rounded-lg border border-border-default flex items-center justify-between"
                >
                  <span className="text-sm text-text-primary">{protocol}</span>
                  <Button variant="outline" size="sm">
                    Adopt Protocol
                  </Button>
                </div>
              ))}
            </div>
          </AppCard>
        </>
      ) : (
        <AppCard title="No Archetype Assigned" description="Generate your AI Twin first">
          <div className="text-sm text-text-secondary">
            Your archetype will be assigned based on your AI Twin model.
          </div>
        </AppCard>
      )}

      {/* Societal Insights */}
      {insights.length > 0 && (
        <AppCard title="Societal Insights" description="Benchmarks and comparisons">
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-4 rounded-lg border",
                  insight.type === "benchmark" && "bg-accent-blue/10 border-accent-blue/30",
                  insight.type === "warning" && "bg-yellow-500/10 border-yellow-500/30",
                  insight.type === "encouragement" && "bg-green-500/10 border-green-500/30"
                )}
              >
                <div className="flex items-start gap-3">
                  {insight.type === "benchmark" && (
                    <TrendingUp className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
                  )}
                  {insight.type === "warning" && (
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  {insight.type === "encouragement" && (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-text-primary mb-1">
                      {insight.title}
                    </div>
                    <div className="text-sm text-text-secondary">{insight.body}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AppCard>
      )}
    </div>
  );
}




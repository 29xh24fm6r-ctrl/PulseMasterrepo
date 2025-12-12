// Collective Intelligence Mesh - Experience v10
// app/(authenticated)/collective/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import { UserCollectiveAlignment } from "@/lib/mesh/alignment";
import { Users, TrendingUp, CheckCircle } from "lucide-react";

export default function CollectiveMeshPage() {
  const [alignments, setAlignments] = useState<UserCollectiveAlignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlignment();
  }, []);

  async function loadAlignment() {
    setLoading(true);
    try {
      const res = await fetch("/api/mesh/alignment");
      if (res.ok) {
        const data = await res.json();
        setAlignments(data.alignments || []);
      }
    } catch (err) {
      console.error("Failed to load alignment:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Computing collective alignment..." />;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Collective Intelligence Mesh</h1>
        <p className="text-sm text-text-secondary">
          Anonymous global knowledge engine
        </p>
      </div>

      {alignments.length === 0 ? (
        <AppCard title="No Alignment Yet" description="Computing your alignment with collective patterns">
          <div className="text-sm text-text-secondary">
            Your alignment will be computed based on your AI Twin model.
          </div>
        </AppCard>
      ) : (
        <div className="space-y-6">
          {alignments.map((alignment, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <AppCard
                title={`You align strongest with: ${alignment.patternCode}`}
                description={alignment.description}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(alignment.fitScore * 100)}% fit
                    </Badge>
                    <span className="text-xs text-text-secondary">
                      Based on collective patterns
                    </span>
                  </div>

                  {alignment.strengths.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-text-primary mb-2">
                        Strengths
                      </div>
                      <div className="space-y-1">
                        {alignment.strengths.map((strength, j) => (
                          <div
                            key={j}
                            className="p-2 bg-green-500/10 rounded border border-green-500/30 text-sm text-text-primary"
                          >
                            {strength}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {alignment.recommendedProtocols.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-text-primary mb-2">
                        Recommended Protocols
                      </div>
                      <div className="space-y-1">
                        {alignment.recommendedProtocols.map((protocol, j) => (
                          <div
                            key={j}
                            className="p-2 bg-accent-blue/10 rounded border border-accent-blue/30 text-sm text-text-primary"
                          >
                            {protocol}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AppCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}




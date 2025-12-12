// Deals Board Component
// app/components/crm/DealsBoard.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CrmDeal {
  id: string;
  name: string;
  stage: string;
  amount?: number;
  primaryContactName?: string;
  health?: {
    score: number;
    risk_level: number;
    days_stalled?: number;
  };
}

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

export function DealsBoard() {
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/deals");
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch (err) {
      console.error("Failed to load deals:", err);
    } finally {
      setLoading(false);
    }
  }

  function getDealsByStage(stage: string): CrmDeal[] {
    return deals.filter((d) => d.stage === stage);
  }

  function getHealthColor(score?: number): string {
    if (!score) return "bg-zinc-800";
    if (score >= 70) return "bg-green-600/20 text-green-400 border-green-600/30";
    if (score >= 40) return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
    return "bg-red-600/20 text-red-400 border-red-600/30";
  }

  function formatCurrency(amount?: number): string {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  if (loading) {
    return (
      <AppCard title="Deals" description="Your pipeline">
        <LoadingState message="Loading deals…" />
      </AppCard>
    );
  }

  if (deals.length === 0) {
    return (
      <AppCard
        title="Deals"
        description="Your pipeline"
        actions={
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        }
      >
        <EmptyState
          title="No deals yet"
          description="Add your first deal to start tracking your pipeline."
        />
      </AppCard>
    );
  }

  return (
    <AppCard
      title="Deals"
      description="Your pipeline"
      actions={
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((stage) => {
            const stageDeals = getDealsByStage(stage);
            return (
              <div key={stage} className="flex-shrink-0 w-64 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white capitalize">{stage}</h3>
                  <Badge variant="outline" className="bg-zinc-800 text-zinc-300">
                    {stageDeals.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                    >
                      <div className="font-medium text-white mb-1">{deal.name}</div>
                      {deal.amount && (
                        <div className="text-sm text-zinc-400 mb-2">{formatCurrency(deal.amount)}</div>
                      )}
                      {deal.primaryContactName && (
                        <div className="text-xs text-zinc-500 mb-2">{deal.primaryContactName}</div>
                      )}
                      {deal.health && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getHealthColor(deal.health.score)}>
                            {deal.health.score}/100
                          </Badge>
                          {deal.health.days_stalled && deal.health.days_stalled > 0 && (
                            <span className="text-xs text-zinc-500">
                              {deal.health.days_stalled}d stalled
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppCard>
  );
}





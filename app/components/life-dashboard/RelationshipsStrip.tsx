// Relationships Strip Component
// app/components/life-dashboard/RelationshipsStrip.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Users, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";

interface CrmOverview {
  summary: {
    totalContacts: number;
    vipContacts: number;
    atRiskRelationships: number;
    openDeals: number;
    wonDeals: number;
    atRiskDeals: number;
  };
  radar: Array<{
    contactId: string;
    fullName: string;
    healthScore: number;
    reason: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    is_positive: boolean;
  }>;
}

export function RelationshipsStrip() {
  const [overview, setOverview] = useState<CrmOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    try {
      const res = await fetch("/api/crm/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      // CRM data not available - that's okay
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Relationships & Deals"
      description="Your people and opportunities"
      actions={
        <div className="flex items-center gap-2">
          <CoachLauncher
            coachKey="sales"
            origin="crm.life_strip"
            variant="link"
            label="Ask Sales Coach"
          />
          <Button size="sm" variant="ghost" asChild>
            <Link href="/relationships">Open Relationships Hub</Link>
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState message="Loading relationships data…" />
      ) : !overview ? (
        <EmptyState
          icon={Users}
          title="No relationships data yet"
          description="Want Pulse to help you stay on top of key people and deals?"
          action={{
            label: "Add your first contact",
            onClick: () => (window.location.href = "/relationships"),
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-zinc-400">Contacts</div>
              <div className="text-white font-medium">{overview.summary.totalContacts}</div>
              {overview.summary.vipContacts > 0 && (
                <div className="text-xs text-yellow-400 mt-1">
                  {overview.summary.vipContacts} VIP
                </div>
              )}
            </div>
            <div>
              <div className="text-zinc-400">Open Deals</div>
              <div className="text-white font-medium">{overview.summary.openDeals}</div>
              {overview.summary.wonDeals > 0 && (
                <div className="text-xs text-green-400 mt-1">
                  {overview.summary.wonDeals} won
                </div>
              )}
            </div>
          </div>
          {overview.summary.atRiskRelationships > 0 && (
            <div className="flex items-center gap-2 text-xs text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              {overview.summary.atRiskRelationships} relationship{overview.summary.atRiskRelationships !== 1 ? "s" : ""} need attention
            </div>
          )}
          {overview.radar.length > 0 && (
            <div className="pt-3 border-t border-zinc-800">
              <div className="text-xs text-zinc-400 mb-2">Top Priority</div>
              {overview.radar.slice(0, 2).map((item) => (
                <div key={item.contactId} className="text-xs text-zinc-300 mb-1">
                  {item.fullName} • {item.healthScore} health
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
}


// Finance Strip Component
// app/components/life-dashboard/FinanceStrip.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";

interface FinanceOverview {
  currentMonth: {
    income: number;
    expenses: number;
    netCashflow: number;
  };
  goals: Array<{ name: string }>;
  alerts: Array<{ title: string; is_positive: boolean }>;
}

export function FinanceStrip() {
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinance();
  }, []);

  async function loadFinance() {
    try {
      const res = await fetch("/api/finance/overview");
      if (res.ok) {
        const data = await res.json();
        setFinance(data);
      }
    } catch (err) {
      // Finance data not available - that's okay
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Money Snapshot"
      description="Quick look at this month's cashflow."
      actions={
        <div className="flex items-center gap-2">
          <CoachLauncher
            coachKey="financial"
            origin="finance.life_strip"
            variant="button"
            size="sm"
          />
          <Button size="sm" variant="ghost" asChild>
            <Link href="/finance">Open Finance Hub</Link>
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState message="Loading finance data…" />
      ) : !finance ? (
        <EmptyState
          icon={DollarSign}
          title="No finance data yet"
          description="Connect or add accounts to build your Money Brain."
          action={{
            label: "Add Account",
            onClick: () => (window.location.href = "/finance"),
          }}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-sm text-zinc-400 mb-1">Net Cashflow This Month</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${
              finance.currentMonth.netCashflow >= 0 ? "text-green-400" : "text-red-400"
            }`}>
              {finance.currentMonth.netCashflow >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              ${Math.abs(finance.currentMonth.netCashflow).toFixed(2)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-zinc-400">Income</div>
              <div className="text-green-400 font-medium">
                ${finance.currentMonth.income.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-zinc-400">Expenses</div>
              <div className="text-red-400 font-medium">
                ${finance.currentMonth.expenses.toFixed(2)}
              </div>
            </div>
          </div>
          {finance.goals && finance.goals.length > 0 && (
            <div className="text-xs text-zinc-400">
              {finance.goals.length} active goal{finance.goals.length !== 1 ? "s" : ""}
            </div>
          )}
          {finance.alerts && finance.alerts.length > 0 && (
            <div className={`text-xs flex items-center gap-1 ${
              finance.alerts[0].is_positive ? "text-green-400" : "text-yellow-400"
            }`}>
              {finance.alerts[0].is_positive ? "✓" : "⚠"} {finance.alerts[0].title}
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
}


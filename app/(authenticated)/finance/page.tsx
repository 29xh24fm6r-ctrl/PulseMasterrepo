// Finance Page - Deep Dive Layout
// app/(authenticated)/finance/page.tsx

"use client";

import { motion } from "framer-motion";
import { Page } from "@/app/components/layout/Page";
import { PageSection } from "@/app/components/layout/PageSection";
import { AnimatedPanel } from "@/components/ui/AnimatedPanel";
import { AppCard } from "@/components/ui/AppCard";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";
import { DollarSign, Target, AlertTriangle } from "lucide-react";

export default function FinancePage() {
  return (
    <Page
      title="Money Brain"
      description="This is your Money Hub. We're here to give you clarity, not judgement."
    >
      {/* Section 1: This Month in Money */}
      <PageSection
        title="This Month in Money"
        description="Your current month financial summary"
      >
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-5 w-5 text-zinc-500" />
        </div>
        <AppCard
          title="This Month"
          description="Income, expenses, and cashflow"
          actions={
            <CoachLauncher
              coachKey="financial"
              origin="finance.main"
              variant="button"
              size="sm"
              label="Talk to Financial Coach"
            />
          }
        >
          <div className="text-sm text-zinc-400">
            Financial summary will appear here
          </div>
        </AppCard>
      </PageSection>

      {/* Section 2: Budgets & Goals */}
      <PageSection
        title="Budgets & Goals"
        description="Your spending targets and financial goals"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-zinc-500" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <AppCard
            title="Budgets"
            description="Monthly spending targets"
          >
            <div className="text-sm text-zinc-400">
              Budget details will appear here
            </div>
          </AppCard>

          <AppCard
            title="Goals"
            description="Financial goals and progress"
          >
            <div className="text-sm text-zinc-400">
              Goal details will appear here
            </div>
          </AppCard>
        </div>
      </PageSection>

      {/* Section 3: Insights & Alerts */}
      <PageSection
        title="Insights & Alerts"
        description="Financial insights and important alerts"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-zinc-500" />
        </div>
        <AppCard
          title="Financial Alerts"
          description="Important updates about your money"
        >
          <div className="text-sm text-zinc-400">
            Alerts will appear here
          </div>
        </AppCard>
      </PageSection>
    </Page>
  );
}


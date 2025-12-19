// Relationships & Deals Hub - Deep Dive Layout
// app/(authenticated)/relationships/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Page } from "@/app/components/layout/Page";
import { PageSection } from "@/app/components/layout/PageSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, Radar, AlertTriangle, Plus } from "lucide-react";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";
import { ContactsTable } from "@/app/components/crm/ContactsTable";
import { DealsBoard } from "@/app/components/crm/DealsBoard";
import { RelationshipRadarPanel } from "@/app/components/crm/RelationshipRadarPanel";
import { CrmAlertsPanel } from "@/app/components/crm/CrmAlertsPanel";
import { NeedsResponsePanel } from "@/components/crm/NeedsResponsePanel";

export default function RelationshipsPage() {
  const [activeTab, setActiveTab] = useState("contacts");

  return (
    <Page
      title="Relationships & Deals"
      description="See the people and deals that matter most right now"
    >
      {/* Section 1: Summary */}
      <PageSection
        title="Overview"
        description="Your relationship and deal pipeline at a glance"
      >
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-zinc-500" />
        </div>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <AppCard variant="metric" title="Contacts" value="—" subtitle="Total contacts" />
          <AppCard variant="metric" title="Open Deals" value="—" subtitle="Active pipeline" />
          <AppCard variant="metric" title="At Risk" value="—" subtitle="Needs attention" trend="down" />
        </div>
        <NeedsResponsePanel limit={10} />
      </PageSection>

      {/* Section 2: Details */}
      <PageSection
        title="Details"
        description="Manage your contacts, deals, and relationships"
      >

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="deals" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Deals
            </TabsTrigger>
            <TabsTrigger value="radar" className="flex items-center gap-2">
              <Radar className="w-4 h-4" />
              Radar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            <ContactsTable />
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            <DealsBoard />
          </TabsContent>

          <TabsContent value="radar" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <RelationshipRadarPanel />
              <CrmAlertsPanel />
            </div>
          </TabsContent>
        </Tabs>
      </PageSection>
    </Page>
  );
}


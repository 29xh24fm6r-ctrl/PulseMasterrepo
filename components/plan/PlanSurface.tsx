"use client";

import { useState } from "react";
import { PlanItem, PlanItemRow } from "./PlanItemRow";
import { PlanSection } from "./PlanSection";
import { useOverlays } from "@/components/shell/overlays/OverlayContext";

const INITIAL_ITEMS: PlanItem[] = [
    {
        id: "1",
        title: "Morning Briefing Generated",
        status: "done",
        source: "pulse",
        timestamp: new Date().toISOString(),
        explainable: true,
        confirmRequired: false
    },
    {
        id: "2",
        title: "Reschedule 'Deep Work' block",
        status: "pending",
        source: "pulse",
        timestamp: new Date().toISOString(),
        explainable: true,
        confirmRequired: true
    },
    {
        id: "3",
        title: "Log Workout",
        status: "done",
        source: "you",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        confirmRequired: false
    }
];

import { SectionHeader } from "@/components/ui/SectionHeader";

export function PlanSurface() {
    const [items, setItems] = useState<PlanItem[]>(INITIAL_ITEMS);
    const { showBanner, hideBanner } = useOverlays();

    const handleApprove = (id: string) => {
        setItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, status: 'done', confirmRequired: false }
                : item
        ));
        // Trigger "Recorded" banner via Stub/Context
        // Note: SystemBanner component implementation might need a way to set custom text
        // For now, toggle active is what the context provides.
        showBanner("Action recorded!");
        setTimeout(() => hideBanner(), 2000);
    };

    const handleUpgrade = () => {
        // Mock upgrade flow
        showBanner("Processing upgrade...");
        setTimeout(() => hideBanner(), 2000);
    };

    const handleDecline = (id: string) => {
        setItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, status: 'blocked', confirmRequired: false }
                : item
        ));
    };

    // Logic to split items
    const today = new Date().toDateString();

    const pendingItems = items.filter(i => i.confirmRequired && i.status === 'pending');
    // Today items: exclude pending-confirm ones (they go to Pending section)
    const todayItems = items.filter(i =>
        !i.confirmRequired &&
        new Date(i.timestamp).toDateString() === today
    );
    const recentItems = items.filter(i =>
        !i.confirmRequired &&
        new Date(i.timestamp).toDateString() !== today
    );

    return (
        <div className="max-w-4xl mx-auto p-6 lg:p-12 pb-32">
            <SectionHeader
                title="Plan"
                subtitle="Execution Ledger"
                className="mb-12"
            />

            <PlanSection
                title="Pending Confirmations"
                isEmpty={pendingItems.length === 0}
                emptyMessage="No approvals needed."
            >
                {pendingItems.map(item => (
                    <PlanItemRow
                        key={item.id}
                        item={item}
                        onApprove={handleApprove}
                        onDecline={handleDecline}
                    />
                ))}
            </PlanSection>

            <PlanSection
                title="Today"
                isEmpty={todayItems.length === 0}
                emptyMessage="Nothing scheduled yet."
            >
                {todayItems.map(item => (
                    <PlanItemRow
                        key={item.id}
                        item={item}
                        onApprove={handleApprove}
                        onDecline={handleDecline}
                    />
                ))}
            </PlanSection>

            <PlanSection
                title="Recent Changes"
                isEmpty={recentItems.length === 0}
                emptyMessage="No recent changes."
            >
                {recentItems.map(item => (
                    <PlanItemRow
                        key={item.id}
                        item={item}
                        onApprove={handleApprove}
                        onDecline={handleDecline}
                    />
                ))}
            </PlanSection>
        </div>
    );
}

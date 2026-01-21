"use client";

import { useOverlays } from "@/components/shell/overlays/OverlayContext";
import { PlanCard, PlanInfo } from "./PlanCard";
import { InvoicesList } from "./InvoicesList";
import { Zap } from "lucide-react";

import { SectionHeader } from "@/components/ui/SectionHeader";

// STUB DATA
const STUB_PLAN: PlanInfo = {
    planName: 'Plus',
    status: 'active',
    renewsOn: new Date(Date.now() + 2592000000).toISOString() // +30 days
};

export function BillingSurface() {
    const { showBanner, hideBanner } = useOverlays();

    const handleUpgrade = () => {
        // Mock subscription
        showBanner("Redirecting to Stripe...");
        setTimeout(() => hideBanner(), 3000);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 lg:p-12 pb-32">
            <SectionHeader
                title="Billing"
                subtitle="Manage your subscription."
                className="mb-12"
            />

            {/* 1. Current Plan */}
            <PlanCard plan={STUB_PLAN} />

            {/* 2. Upgrade CTA */}
            <button
                onClick={handleUpgrade}
                className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all mb-12 hover:scale-[1.01]"
            >
                <Zap className="w-5 h-5 fill-current" />
                <span>Upgrade to Pro</span>
            </button>

            {/* 3. Invoices */}
            <InvoicesList />

        </div>
    );
}

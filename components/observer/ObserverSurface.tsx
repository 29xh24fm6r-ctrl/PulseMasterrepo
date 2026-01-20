"use client";

import { useState } from "react";
import { ObserverTabValue, ObserverTabs } from "./ObserverTabs";
import { RuntimePanel } from "./panels/RuntimePanel";
import { AutonomyPanel } from "./panels/AutonomyPanel";
import { EffectsPanel } from "./panels/EffectsPanel";
import { IPPPanel } from "./panels/IPPPanel";
import { BackgroundPanel } from "./panels/BackgroundPanel";

import { SectionHeader } from "@/components/ui/SectionHeader";

export function ObserverSurface() {
    const [activeTab, setActiveTab] = useState<ObserverTabValue>('runtime');

    const renderPanel = () => {
        switch (activeTab) {
            case 'runtime': return <RuntimePanel />;
            case 'autonomy': return <AutonomyPanel />;
            case 'effects': return <EffectsPanel />;
            case 'ipp': return <IPPPanel />;
            case 'background': return <BackgroundPanel />;
            default: return null;
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 lg:p-12 pb-32">
            <SectionHeader
                title="Observer"
                subtitle="Inspection mode. No actions are taken here."
                className="mb-8"
            />

            <ObserverTabs activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderPanel()}
            </div>
        </div>
    );
}

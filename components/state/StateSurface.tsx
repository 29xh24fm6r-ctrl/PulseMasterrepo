"use client";

import { LifeStateSnapshot } from "@/components/home/LifeStateSnapshot";
import { StateTrends } from "./StateTrends";
import { NotableEvents, NotableEvent } from "./NotableEvents";
import { AskPulseCTA } from "./AskPulseCTA";
import { TrendPoint } from "./TrendRow";
import { LifeState } from "@/components/home/LifeStateSnapshot";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { TOKENS } from "@/lib/ui/tokens";

// STUB DATA
const STUB_STATE: LifeState = {
    energy: 'Medium',
    stress: 'Low',
    momentum: 'Medium'
};

const generateTrends = (): { energy: TrendPoint[], stress: TrendPoint[], momentum: TrendPoint[] } => {
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    return {
        energy: dates.map(d => ({ date: d, value: Math.random() > 0.5 ? 'High' : 'Medium' })),
        stress: dates.map(d => ({ date: d, value: Math.random() > 0.8 ? 'Medium' : 'Low' })),
        momentum: dates.map(d => ({ date: d, value: Math.random() > 0.3 ? 'Medium' : 'Low' })),
    };
};

const STUB_EVENTS: NotableEvent[] = [
    {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'coordination',
        title: 'Quiet mode enabled',
        detail: 'Pulse reduced interruptions for a bit to preserve focus.',
        explainable: true
    },
    {
        id: '2',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        type: 'shift',
        title: 'Momentum stabilized',
        detail: 'Consistent activity detected over the last 24 hours.',
        explainable: false
    }
];

export function StateSurface() {
    const trends = generateTrends();

    return (
        <div className="max-w-2xl mx-auto p-6 lg:p-12 pb-32">
            <SectionHeader
                title="Life State"
                subtitle="Regulation Visibility"
                className="mb-12"
            />

            {/* 1. Current Snapshot */}
            <div className="mb-12">
                <h2 className={`text-xs font-semibold ${TOKENS.COLORS.text.dim} uppercase tracking-wider mb-4 px-2`}>
                    Current
                </h2>
                <LifeStateSnapshot state={STUB_STATE} />
            </div>

            {/* 2. Trends */}
            <StateTrends
                energyData={trends.energy}
                stressData={trends.stress}
                momentumData={trends.momentum}
            />

            {/* 3. Notable Events */}
            <NotableEvents events={STUB_EVENTS} />

            {/* 4. Ask CTA */}
            <AskPulseCTA />
        </div>
    );
}

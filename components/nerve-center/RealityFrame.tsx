"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface RealityFrameProps {
    scheduleSector: ReactNode;
    relationshipSector: ReactNode;
    responsibilitySector: ReactNode;
    commandSector: ReactNode;
    domains: {
        work: boolean;
        relationships: boolean;
        money: boolean;
        health: boolean;
        personal: boolean;
    };
}

export const RealityFrame = ({
    scheduleSector,
    relationshipSector,
    responsibilitySector,
    commandSector,
    domains
}: RealityFrameProps) => {

    // Domain Indicator Helper
    const DomainBadge = ({ label, active }: { label: string, active: boolean }) => (
        <div className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest border ${active ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/5" : "border-zinc-800 text-zinc-600 bg-transparent"
            } rounded-full`}>
            {label}
        </div>
    );

    return (
        <div className="w-full h-full max-w-6xl mx-auto p-6 md:p-12 flex flex-col relative">

            {/* 1. Header: Domain Matrix */}
            <header className="flex justify-center gap-2 mb-12">
                <DomainBadge label="Work" active={domains.work} />
                <DomainBadge label="People" active={domains.relationships} />
                <DomainBadge label="Money" active={domains.money} />
                <DomainBadge label="Body" active={domains.health} />
                <DomainBadge label="Self" active={domains.personal} />
            </header>

            {/* 2. Main Data Grid */}
            <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">

                {/* Left Column: Temporal Reality */}
                <section className="flex flex-col gap-8">
                    <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 border-b border-zinc-800 pb-2">My Time</h2>
                    {scheduleSector}
                </section>

                {/* Right Column: Social & Operational Reality */}
                <section className="flex flex-col gap-12">
                    <div className="flex flex-col gap-6">
                        <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 border-b border-zinc-800 pb-2">My People</h2>
                        {relationshipSector}
                    </div>

                    <div className="flex flex-col gap-6">
                        <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 border-b border-zinc-800 pb-2">My Must-Dos</h2>
                        {responsibilitySector}
                    </div>
                </section>

            </main>

            {/* 3. Executive Directive (Footer/Overlay) */}
            <footer className="mt-12 flex justify-center">
                {commandSector}
            </footer>
        </div>
    );
};

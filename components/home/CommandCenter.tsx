"use client";

import { motion } from "framer-motion";
import { useEncounter } from "@/components/encounter/EncounterContext";
import { RealityFrame } from "@/components/nerve-center/RealityFrame";
import { ScheduleFeed } from "@/components/nerve-center/ScheduleFeed";
import { SocialSignal } from "@/components/nerve-center/SocialSignal";
import { ActionQueue } from "@/components/nerve-center/ActionQueue";

export const CommandCenter = () => {
    const { state, resolveEncounter, isResolved } = useEncounter();

    if (isResolved) return null;

    // --- MOCK REALITY DATA (To be replaced by real providers) ---

    // 1. Schedule Data
    const scheduleData = {
        status: "FREE" as const,
        freeUntil: "14:00",
        nextEvent: {
            name: "Strategy Sync",
            time: "14:00"
        }
    };

    // 2. Social Data
    const socialData = [
        { id: "1", name: "Alex", status: "No reply (3 days)", urgency: "HIGH" as const },
        { id: "2", name: "Mom", status: "Birthday (This Week)", urgency: "MEDIUM" as const }
    ];

    // 3. Action Data
    const actionData = [
        { id: "1", task: "Invoice #1024", blocker: "Not Sent", isCritical: true },
        { id: "2", task: "Q1 Hiring Plan", blocker: "Decision Overdue", isCritical: false }
    ];

    // 4. Domain Data
    const domainData = {
        work: true,
        relationships: true,
        money: true,
        health: false,
        personal: false
    };

    // 5. Derived Command
    const commandText = "Clear Overdue Items"; // Derived from ActionQueue having Critical Item

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-screen fixed inset-0 z-50 bg-black text-white font-sans overflow-y-auto"
        >
            <RealityFrame
                domains={domainData}
                scheduleSector={
                    <ScheduleFeed {...scheduleData} />
                }
                relationshipSector={
                    <SocialSignal signals={socialData} />
                }
                responsibilitySector={
                    <ActionQueue items={actionData} />
                }
                commandSector={
                    <button
                        onClick={resolveEncounter}
                        className="px-12 py-6 bg-white hover:bg-zinc-200 text-black text-lg font-bold tracking-widest uppercase rounded-full shadow-[0_0_40px_-5px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105 active:scale-95"
                    >
                        {commandText}
                    </button>
                }
            />
        </motion.div>
    );
};

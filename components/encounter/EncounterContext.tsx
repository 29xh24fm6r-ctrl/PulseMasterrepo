"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type EncounterState = "CLEAR" | "PRESSURE" | "HIGH_COST";

interface EncounterContextType {
    state: EncounterState;
    situationText: string; // The Briefing
    oneThing: string | null;
    actionLabel: string | null;
    isResolved: boolean;
    isAligning: boolean; // New state for Nano generation
    resolveEncounter: () => void;
}

const EncounterContext = createContext<EncounterContextType | undefined>(undefined);

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { generateInsight } from "@/lib/ai/nano";
import { getDeepContext } from "@/lib/context/aggregation";

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
    // 1. Auth & Routing State
    const { userId, isLoaded } = useAuth();
    const pathname = usePathname();

    // 2. Encounter State
    const [state, setState] = useState<EncounterState>("CLEAR");
    const [situationText, setSituationText] = useState("");
    const [oneThing, setOneThing] = useState<string | null>(null);
    const [actionLabel, setActionLabel] = useState<string | null>(null);
    const [isResolved, setIsResolved] = useState(true);
    const [isAligning, setIsAligning] = useState(false); // Nano Loading State
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isLoaded || !mounted) return;

        // AUTH & ROUTE GUARD
        const isPublicRoute = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");
        const hasSeenEncounter = sessionStorage.getItem("pulse_encounter_seen");

        if (!userId || isPublicRoute || hasSeenEncounter === "true") {
            setIsResolved(true);
            return;
        }

        // TRIGGER INSIGHT ENGINE (Phase 13)
        const runInsightEngine = async () => {
            setIsResolved(false);
            setIsAligning(true);

            try {
                // 1. Gather Context (Instant)
                const context = await getDeepContext();

                // 2. Generate Insight (Nano)
                const insight = await generateInsight(context);

                // 3. Set State
                setSituationText(insight);

                // Determine State based on Critical Alerts
                if (context.criticalAlerts.length > 0) {
                    setState("PRESSURE");
                    setOneThing(context.criticalAlerts[0]);
                } else if (context.tasks.length > 0) {
                    setState("CLEAR"); // "Clean slate with purpose"
                    setOneThing(`Priority: ${context.tasks[0]}`);
                } else {
                    setState("CLEAR");
                    setOneThing(null);
                }

            } catch (e) {
                console.error("Insight Engine Failed", e);
                // Fallback
                setSituationText("Pulse systems active.");
                setState("CLEAR");
            } finally {
                setIsAligning(false);
            }
        };

        runInsightEngine();

    }, [isLoaded, userId, pathname, mounted]);

    const resolveEncounter = () => {
        setIsResolved(true);
        sessionStorage.setItem("pulse_encounter_seen", "true");
    };

    return (
        <EncounterContext.Provider
            value={{
                state,
                situationText,
                oneThing,
                actionLabel,
                isResolved,
                isAligning,
                resolveEncounter,
            }}
        >
            {children}
        </EncounterContext.Provider>
    );
};

export const useEncounter = () => {
    const context = useContext(EncounterContext);
    if (context === undefined) {
        throw new Error("useEncounter must be used within an EncounterProvider");
    }
    return context;
};

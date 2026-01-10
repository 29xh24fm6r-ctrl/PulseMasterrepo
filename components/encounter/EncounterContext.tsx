"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type EncounterState = "CLEAR" | "PRESSURE" | "HIGH_COST";

interface EncounterContextType {
    state: EncounterState;
    situationText: string;
    oneThing: string | null;
    actionLabel: string | null;
    isResolved: boolean;
    resolveEncounter: () => void;
}

const EncounterContext = createContext<EncounterContextType | undefined>(undefined);

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
    // 1. Auth & Routing State
    const { userId, isLoaded } = useAuth();
    const pathname = usePathname();

    // 2. Encounter State
    const [state, setState] = useState<EncounterState>("CLEAR");
    const [situationText, setSituationText] = useState("Checking status..."); // Immediate Placeholder
    const [oneThing, setOneThing] = useState<string | null>(null);
    const [actionLabel, setActionLabel] = useState<string | null>(null);
    const [isResolved, setIsResolved] = useState(true); // Default to resolved (hidden) to prevent flash on public routes
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isLoaded || !mounted) return;

        // AUTH & ROUTE GUARD (Canon Fix #2)
        const isPublicRoute = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");
        const hasSeenEncounter = sessionStorage.getItem("pulse_encounter_seen");

        if (!userId || isPublicRoute || hasSeenEncounter === "true") {
            setIsResolved(true);
            return;
        }

        // ENCOUNTER LOGIC (Canon Fix #1 - Immediate)
        setIsResolved(false);

        // Simulation of observational logic (Immediate execution):
        const random = Math.random();

        if (random > 0.8) {
            // LEGENDARY MOMENT
            setState("PRESSURE");
            setSituationText("This is where it usually gets harder.");
            setOneThing("You ignored the Strategy Review notification twice yesterday.");
            setActionLabel("Show Review");
        } else if (random > 0.7) {
            setState("HIGH_COST");
            setSituationText("Each delay has increased the effort required.");
            setOneThing("Q1 Strategic Review is 4 days overdue.");
            setActionLabel("Review Strategy");
        } else if (random > 0.5) {
            setState("PRESSURE");
            setSituationText("You've hovered here three times today without acting.");
            setOneThing("The Tax Filing deadline is in 2 days.");
            setActionLabel("Resolve this");
        } else {
            // SILENCE DISCIPLINE (Canon Fix #3)
            setState("CLEAR");
            // CLEAR state must be silent, but component handles visibility.
            // We set text empty to ensure Silence.
            setSituationText("");
            setOneThing(null);
            setActionLabel(null);
        }

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

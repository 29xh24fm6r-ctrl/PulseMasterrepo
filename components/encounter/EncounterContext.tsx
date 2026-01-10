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

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<EncounterState>("CLEAR");
    const [situationText, setSituationText] = useState("Nothing urgent right now.");
    const [oneThing, setOneThing] = useState<string | null>(null);
    const [actionLabel, setActionLabel] = useState<string | null>(null);
    const [isResolved, setIsResolved] = useState(false);
    const [isMounting, setIsMounting] = useState(true);

    useEffect(() => {
        // Logic to determine state based on "Cognitive Load" or "Critical Tasks"
        // For now, we simulate a check. In a real scenario, this would fetch from an API.

        // Simulation of observational logic:
        // "Clear" = 60% chance
        // "Pressure" = 30% chance (e.g. Tax Deadline)
        // "High Cost" = 10% chance (e.g. Strategic Review overdue)

        const random = Math.random();

        if (random > 0.9) {
            setState("HIGH_COST");
            // Observational copy: Cause -> Effect
            setSituationText("Each delay has increased the effort required.");
            setOneThing("Q1 Strategic Review is 4 days overdue.");
            setActionLabel("Review Strategy");
        } else if (random > 0.6) {
            setState("PRESSURE");
            // Observational copy: Timing/Pattern
            setSituationText("This usually takes longer if it waits past tonight.");
            setOneThing("The Tax Filing deadline is in 2 days.");
            setActionLabel("Resolve this");
        } else {
            setState("CLEAR");
            // Silence Discipline: "If nothing needs attention, nothing should appear."
            // We set empty string or minimal "Presence" text if needed, but the void handles the silence.
            setSituationText("");
            setOneThing(null);
            setActionLabel((null));
        }

        setIsMounting(false);
    }, []);

    const resolveEncounter = () => {
        setIsResolved(true);
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

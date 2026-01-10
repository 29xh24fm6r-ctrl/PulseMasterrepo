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
        // "Clear" = 50% chance
        // "Pressure" = 20% chance
        // "High Cost" = 10% chance
        // "Legendary Moment" = 20% chance (First-Week Moment)

        const random = Math.random();

        if (random > 0.8) {
            // THE LEGENDARY MOMENT (First-Week Pattern)
            // Trigger: Pulse detects delay -> Heads up ignored -> "This is where it usually gets harder."
            setState("PRESSURE");
            setSituationText("This is where it usually gets harder.");
            setOneThing("You ignored the Strategy Review notification twice yesterday.");
            setActionLabel("Show Review");
        } else if (random > 0.7) {
            setState("HIGH_COST");
            // Observational: Cause -> Effect (Time cost)
            setSituationText("Each delay has increased the effort required.");
            setOneThing("Q1 Strategic Review is 4 days overdue.");
            setActionLabel("Review Strategy");
        } else if (random > 0.5) {
            setState("PRESSURE");
            // Observational: Pattern Recognition
            setSituationText("You've hovered here three times today without acting.");
            setOneThing("The Tax Filing deadline is in 2 days.");
            setActionLabel("Resolve this");
        } else {
            setState("CLEAR");
            // SILENCE DISCIPLINE:
            // "You’re ahead right now — that’s uncommon at this hour." (Rare positive reinforcement)
            // Or typically just: Silence.

            // For now, straightforward silence unless we want that specific "ahead" moment.
            // Let's implement the "Ahead" moment as a rare CLEAR variant.
            if (Math.random() > 0.7) {
                setSituationText(""); // True silence
            } else {
                setSituationText(""); // True silence (Default)
            }
            // Note: Encounter copy is "Text fade" on dwell. If text is empty, it remains silent.
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

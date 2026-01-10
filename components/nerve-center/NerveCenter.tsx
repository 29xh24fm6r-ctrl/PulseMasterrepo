"use client";

import { motion } from "framer-motion";
import { useEncounter } from "@/components/encounter/EncounterContext";
import { SystemChassis } from "@/components/nerve-center/SystemChassis";
import { PressureField } from "@/components/nerve-center/PressureField";
import { FocusShield } from "@/components/nerve-center/FocusShield";
import { HorizonLine } from "@/components/nerve-center/HorizonLine";

export const NerveCenter = () => {
    const { state, oneThing, resolveEncounter, isResolved } = useEncounter();

    // MAP DATA TO VISUALS
    // 1. Focus Status
    const focusStatus = state === "HIGH_COST" ? "ENGAGED" : state === "PRESSURE" ? "LOCKED" : "OPEN";

    // 2. Pressure Intensity
    const pressureIntensity = state === "HIGH_COST" ? "HIGH" : state === "PRESSURE" ? "MEDIUM" : "LOW";

    // 3. Horizon Status (Derived from state for now)
    const horizonStatus = state === "HIGH_COST" ? "IMMINENT" : state === "PRESSURE" ? "DISTANT" : "CLEAR";

    // 4. Capacity (Mocked based on state for now)
    const capacity = state === "HIGH_COST" ? "REDUCED" : "NOMINAL";

    if (isResolved) return null;

    return (
        <div className="relative w-full h-screen flex flex-col overflow-hidden bg-black font-sans selection:bg-amber-500/30 z-50 fixed inset-0">
            <SystemChassis capacity={capacity}>

                {/* 1. AMBIENT PRESSURE */}
                <PressureField intensity={pressureIntensity} />

                {/* 2. CENTER OF GRAVITY (FOCUS) */}
                <div className="relative z-20 mb-12" onClick={resolveEncounter}>
                    <FocusShield
                        status={focusStatus}
                        label={oneThing || "Unstructured Time"}
                        subLabel={state === "CLEAR" ? "Horizon Open" : "Active Focus"}
                    />

                    {/* Command Trigger Overlay */}
                    <div className="absolute inset-0 cursor-pointer rounded-full" />
                </div>

                {/* 3. FORWARD SCAN (HORIZON) */}
                <div className="absolute bottom-24 w-full px-12 z-20">
                    <HorizonLine
                        status={horizonStatus}
                        timeToImpact={state === "HIGH_COST" ? "NOW" : state === "PRESSURE" ? "2h" : undefined}
                        nextEventName={state === "HIGH_COST" ? "Critical Load" : undefined}
                    />
                </div>

                {/* COMMAND PROMPT (Emergent Response) */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    onClick={resolveEncounter}
                    className="absolute bottom-12 text-xs font-bold tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors z-30"
                >
                    {state === "CLEAR" ? "Enter System" : "Resolve Status"}
                </motion.button>

            </SystemChassis>
        </div>
    );
};

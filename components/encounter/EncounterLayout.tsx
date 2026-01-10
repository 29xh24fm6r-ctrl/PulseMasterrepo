"use client";

import React from "react";
import { EncounterProvider, useEncounter } from "./EncounterContext";
import { NerveCenter } from "../nerve-center/NerveCenter";
import { AnimatePresence, motion } from "framer-motion";
import { CanonGuard } from "../debug/CanonGuard";

function EncounterInner({ children }: { children: React.ReactNode }) {
    const { isResolved } = useEncounter();

    return (
        <>
            <CanonGuard />
            <NerveCenter />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{
                    opacity: isResolved ? 1 : 0,
                    pointerEvents: isResolved ? "auto" : "none"
                }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                className="relative min-h-screen"
            >
                {children}
            </motion.div>
        </>
    );
}

export function EncounterLayout({ children }: { children: React.ReactNode }) {
    return (
        <EncounterProvider>
            <EncounterInner>{children}</EncounterInner>
        </EncounterProvider>
    );
}

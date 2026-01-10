"use client";

import { CommandCenter } from "@/components/home/CommandCenter";

// The NerveCenter is the global overlay for the Living HUD.
// It delegates the entire experience to the CommandCenter, 
// ensuring a single source of truth for the v5.0 UI.
export const NerveCenter = () => {
    return <CommandCenter />;
};

"use client";

import { ReactNode } from "react";
import { PresenceBar } from "./PresenceBar";
import { PrimaryNavigation } from "./PrimaryNavigation";
import { ContextStrip } from "./ContextStrip";
import { OverlayRoot } from "./overlays/OverlayRoot";
import { useOverlays } from "./overlays/OverlayContext";

function ShellContent({ children }: { children: ReactNode }) {
    const { ippActive } = useOverlays();

    // IPP Replacement Logic: If IPP is active, we do not render children (Region B) and disable Nav visually (via blocking overlay)
    // Actually, IPP overlay is Z-50, it covers everything. The spec says "Region B (Surface Outlet) is NOT rendered".
    // So we conditionally render children based on IPP state if we want to be strict about "NOT rendered".

    return (
        <div className="flex flex-col h-screen w-full bg-zinc-50 dark:bg-black overflow-hidden relative">
            {/* Overlays (Global) */}
            <OverlayRoot />

            {/* Region A: Presence Bar */}
            <PresenceBar />

            {/* Region D: Context Strip */}
            <ContextStrip />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Region C: Primary Navigation (Desktop Rail) */}
                {/* Visual disabling is handled by IPP overlay covering it, but we can also hide it if spec requires 'disabled or hidden' */}
                <div className={`shrink-0 ${ippActive ? 'pointer-events-none opacity-50' : ''}`}>
                    <PrimaryNavigation />
                </div>

                {/* Region B: Surface Outlet */}
                <main className="flex-1 relative overflow-y-auto overflow-x-hidden min-w-0" id="pulse-main-surface">
                    {!ippActive && children}
                </main>
            </div>
        </div>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <ShellContent>{children}</ShellContent>
    );
}

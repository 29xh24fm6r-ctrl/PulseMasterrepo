"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { publishPulseContext } from "@/lib/companion/contextBus";

/**
 * Internal logic for tracking context.
 * Separated to allow Suspense wrapping for useSearchParams.
 */
function ContextTrackerLogic() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Construct a baseline context frame
        const route = pathname || "/";
        const query = searchParams ? searchParams.toString() : "";
        const fullPath = query ? `${route}?${query}` : route;

        // Publish to the bus
        publishPulseContext({
            route: fullPath,
            title: document.title || "Pulse", // Best-effort title
            hints: [], // Default empty hints, pages can augment if needed
        });

        // Debug logging for verification (dev only)
        if (process.env.NODE_ENV !== "production") {
            console.debug("[PulseContextTracker] Published:", fullPath);
        }
    }, [pathname, searchParams]);

    return null;
}

/**
 * Global component to track navigation and broadcast context to the Pulse Window.
 * Must be mounted in RootLayout.
 */
export default function PulseContextTracker() {
    return (
        <Suspense fallback={null}>
            <ContextTrackerLogic />
        </Suspense>
    );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { presencePing, presenceSendEvent, presenceSendState } from "./publisher";

function envHint(): string | undefined {
    // safe, build-friendly
    if (typeof window === "undefined") return undefined;
    // optionally: infer from hostname or injected env var
    const host = window.location.hostname;
    if (host.endsWith("vercel.app")) return "preview";
    if (host === "localhost") return "dev";
    return "production";
}

export function usePresencePublisher() {
    const pathname = usePathname();

    useEffect(() => {
        presencePing();
    }, []);

    useEffect(() => {
        presenceSendState({
            route: pathname ?? "/",
            envHint: envHint(),
        });

        presenceSendEvent({
            id: crypto.randomUUID(),
            ts: Date.now(),
            kind: "route",
            route: pathname ?? "/",
            label: `Route: ${pathname ?? "/"}`,
        });
    }, [pathname]);
}

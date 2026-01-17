"use client";

import { useEffect } from "react";
import { publishPulseContext, PulseContextFrame } from "@/lib/companion/contextBus";
import { usePathname } from "next/navigation";

export function usePulseContext(frame: Omit<PulseContextFrame, "ts" | "route">) {
    const pathname = usePathname();

    useEffect(() => {
        publishPulseContext({ route: pathname || "/", ...frame });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, JSON.stringify(frame)]);
}

"use client";

import { usePathname } from "next/navigation";
import PulseObserverPanel from "./PulseObserverPanel";
import { useObserverRuntime } from "@/lib/observer/useObserverRuntime";
import { isObserverEnabled, setObserverEnabled } from "@/lib/observer/store";
import { useEffect } from "react";

export default function PulseObserverMount() {
    const pathname = usePathname();

    useEffect(() => {
        // allow enabling via ?observer=1 without requiring manual localStorage edits
        if (typeof window === "undefined") return;
        const qs = new URLSearchParams(window.location.search);
        if (qs.get("observer") === "1" && !isObserverEnabled()) setObserverEnabled(true);
    }, []);

    useObserverRuntime(pathname);

    return <PulseObserverPanel route={pathname} />;
}

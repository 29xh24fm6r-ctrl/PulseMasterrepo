"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { enableObserver, isObserverEnabled } from "@/lib/observer/enabled";
import PulseObserverPanel from "@/components/observer/PulseObserverPanel";
import { useObserverRuntime } from "@/lib/observer/useObserverRuntime";


function enableFromQueryOnce() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("observer") === "1") enableObserver();
}

export default function ObserverMount() {
    const [enabled, setEnabled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        enableFromQueryOnce();
        // We can just rely on the enableObserver call above setting the local storage
        // But we need to ensure we re-read it to update state if it changed.
        // However, enableObserver is sync.
        setEnabled(isObserverEnabled());
    }, []);

    useObserverRuntime(pathname);

    if (!enabled) return null;
    return <PulseObserverPanel route={pathname} />;
}

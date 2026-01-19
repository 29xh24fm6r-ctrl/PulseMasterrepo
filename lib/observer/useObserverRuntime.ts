"use client";

import { useEffect } from "react";
import { sanitizeText, safeTargetDescriptor } from "./sanitize";
import { isObserverEnabled, pushEvent } from "./store";

export function useObserverRuntime(currentRoute?: string) {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!isObserverEnabled()) return;

        // Route event
        if (currentRoute) pushEvent({ type: "route", route: currentRoute });

        // Clicks
        const onClick = (e: MouseEvent) => {
            pushEvent({
                type: "click",
                route: currentRoute,
                meta: { target: safeTargetDescriptor(e.target) },
            });
        };

        // Inputs (sanitized, never store raw)
        const onInput = (e: Event) => {
            const t = e.target as HTMLInputElement | HTMLTextAreaElement | null;
            if (!t) return;
            const name = t.name || t.id || t.getAttribute("aria-label") || t.getAttribute("placeholder") || "input";
            pushEvent({
                type: "input",
                route: currentRoute,
                meta: { field: sanitizeText(name), valueLen: String(t.value || "").length },
            });
        };

        // Keydowns (only log key category, not full text)
        const onKeyDown = (e: KeyboardEvent) => {
            const key = e.key;
            const cat =
                key === "Enter" || key === "Escape" || key === "Tab" ? key :
                    key.startsWith("Arrow") ? "Arrow" :
                        key.length === 1 ? "Char" :
                            "Other";
            pushEvent({ type: "keydown", route: currentRoute, meta: { key: cat } });
        };

        // Errors
        const onError = (e: ErrorEvent) => {
            pushEvent({
                type: "error",
                route: currentRoute,
                message: sanitizeText(e.message),
                meta: { filename: sanitizeText(e.filename), lineno: e.lineno, colno: e.colno },
            });
        };

        const onRejection = (e: PromiseRejectionEvent) => {
            pushEvent({
                type: "unhandledrejection",
                route: currentRoute,
                message: sanitizeText(String(e.reason?.message || e.reason || "unhandled rejection")),
            });
        };

        // Fetch wrapper (network failures)
        const origFetch = window.fetch.bind(window);
        window.fetch = async (...args: any[]) => {
            const url = typeof args[0] === "string" ? args[0] : (args[0]?.url || "unknown");
            try {
                const res = await origFetch(...args);
                if (!res.ok) {
                    pushEvent({ type: "network", route: currentRoute, message: `HTTP ${res.status}`, meta: { ok: false, url: sanitizeText(url) } });
                }
                return res;
            } catch (err: any) {
                pushEvent({ type: "network", route: currentRoute, message: sanitizeText(err?.message || "fetch failed"), meta: { ok: false, url: sanitizeText(url) } });
                throw err;
            }
        };

        // Perf: first paint-ish
        const perfTimer = window.setTimeout(() => {
            const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
            if (nav) {
                pushEvent({
                    type: "perf",
                    route: currentRoute,
                    meta: {
                        domInteractive: Math.round(nav.domInteractive),
                        domComplete: Math.round(nav.domComplete),
                        loadEventEnd: Math.round(nav.loadEventEnd),
                    },
                });
            }
        }, 1500);

        window.addEventListener("click", onClick, true);
        window.addEventListener("input", onInput, true);
        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);

        return () => {
            window.clearTimeout(perfTimer);
            window.fetch = origFetch;
            window.removeEventListener("click", onClick, true);
            window.removeEventListener("input", onInput, true);
            window.removeEventListener("keydown", onKeyDown, true);
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onRejection);
        };
    }, [currentRoute]);
}

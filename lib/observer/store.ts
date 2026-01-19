import { isObserverEnabled } from "./enabled";
import { OBSERVER_EVENTS_KEY, OBSERVER_STARTED_AT_KEY } from "./keys";
import type { ObserverBundle, ObserverEvent } from "./types";

// Re-export for compatibility if needed, but prefer using enabled.ts directly
export { isObserverEnabled, enableObserver, disableObserver } from "./enabled";

const MAX_EVENTS = 400;

function uid() {
    return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export function ensureSessionStarted() {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(OBSERVER_STARTED_AT_KEY)) {
        window.localStorage.setItem(OBSERVER_STARTED_AT_KEY, String(Date.now()));
    }
}

export function pushEvent(ev: Omit<ObserverEvent, "id" | "ts">) {
    if (typeof window === "undefined") return;
    if (!isObserverEnabled()) return;

    ensureSessionStarted();

    const events = readEvents();
    const next: ObserverEvent = { id: uid(), ts: Date.now(), ...ev };

    events.push(next);
    // ring buffer
    while (events.length > MAX_EVENTS) events.shift();

    window.localStorage.setItem(OBSERVER_EVENTS_KEY, JSON.stringify(events));
}

export function readEvents(): ObserverEvent[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(OBSERVER_EVENTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as ObserverEvent[];
    } catch {
        return [];
    }
}

export function clearEvents() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(OBSERVER_EVENTS_KEY);
    window.localStorage.removeItem(OBSERVER_STARTED_AT_KEY);
}

export function buildBundle(routeAtExport?: string): ObserverBundle {
    const events = readEvents();
    const startedAt = Number(window.localStorage.getItem(OBSERVER_STARTED_AT_KEY) || Date.now());
    const endedAt = Date.now();

    const routes = Array.from(new Set(events.filter(e => e.type === "route").map(e => e.route).filter(Boolean))) as string[];
    const errors = events.filter(e => e.type === "error" || e.type === "unhandledrejection");
    const netFails = events.filter(e => e.type === "network" && e.meta?.ok === false);

    const clicks = events.filter(e => e.type === "click").length;
    const inputs = events.filter(e => e.type === "input").length;
    const keydowns = events.filter(e => e.type === "keydown").length;

    const env: "dev" | "preview" | "prod" =
        window.location.hostname.includes("localhost") ? "dev" :
            window.location.hostname.includes("vercel") ? "preview" :
                "prod";

    return {
        app: {
            name: "Pulse",
            env,
            userAgent: navigator.userAgent,
            locale: navigator.language,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        session: {
            startedAt,
            endedAt,
            durationMs: endedAt - startedAt,
            routeAtExport,
        },
        events,
        summary: {
            routes,
            errors: { count: errors.length, last: errors[errors.length - 1]?.message },
            network: { failures: netFails.length, lastFailure: netFails[netFails.length - 1]?.message },
            interactions: { clicks, inputs, keydowns },
        },
    };
}

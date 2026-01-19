import {
    OBSERVER_ENABLED_KEY,
    OBSERVER_UI_HIDDEN_KEY,
    OBSERVER_UI_DOCK_KEY,
} from "./keys";

export type ObserverDock = "br" | "bl";

export function isObserverEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(OBSERVER_ENABLED_KEY) === "true";
}

export function enableObserver(): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OBSERVER_ENABLED_KEY, "true");
    // When enabling, also un-hide (safety)
    window.localStorage.removeItem(OBSERVER_UI_HIDDEN_KEY);
}

export function disableObserver(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(OBSERVER_ENABLED_KEY);
    window.localStorage.removeItem(OBSERVER_UI_HIDDEN_KEY);
}

export function isObserverHidden(): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(OBSERVER_UI_HIDDEN_KEY) === "true";
}

export function setObserverHidden(hidden: boolean): void {
    if (typeof window === "undefined") return;
    if (hidden) window.localStorage.setItem(OBSERVER_UI_HIDDEN_KEY, "true");
    else window.localStorage.removeItem(OBSERVER_UI_HIDDEN_KEY);
}

export function getObserverDock(): ObserverDock {
    if (typeof window === "undefined") return "br";
    const v = window.localStorage.getItem(OBSERVER_UI_DOCK_KEY);
    return v === "bl" ? "bl" : "br";
}

export function setObserverDock(dock: ObserverDock): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OBSERVER_UI_DOCK_KEY, dock);
}

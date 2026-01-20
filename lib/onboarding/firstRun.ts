"use client";

const FIRST_RUN_KEY = 'pulse.bridge.hasSeenFirstRun';

export function hasSeenFirstRun(): boolean {
    if (typeof window === 'undefined') return false; // Default to false (or true? safely false to avoid hydration mismatch if possible, but actually pure client check is better)
    // Actually for redirects, we want to know current state.
    return !!localStorage.getItem(FIRST_RUN_KEY);
}

export function markFirstRunComplete() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(FIRST_RUN_KEY, '1');
}

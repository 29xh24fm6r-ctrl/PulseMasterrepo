import { createClient } from '@/lib/supabase/server';

export type PulseActionType =
    | "START_FOCUS"
    | "CREATE_TASK"
    | "LOG_HABIT"
    | "NAVIGATE"
    | "SHOW_INSIGHT"
    | "UNKNOWN";

export interface PulseIntent {
    type: PulseActionType;
    confidence: number;
    payload: any;
    originalQuery: string;
}

/**
 * The "Breathing" Logic.
 * Parses natural language into system intents without complex syntax.
 */
export async function routeIntent(query: string): Promise<PulseIntent> {
    const normalized = query.toLowerCase().trim();

    // 1. Focus Mode / Deep Work
    if (normalized.includes("focus") || normalized.includes("deep work") || normalized.includes("zone in")) {
        return {
            type: "START_FOCUS",
            confidence: 0.9,
            payload: { duration: 60 }, // Default 1h
            originalQuery: query
        };
    }

    // 2. Navigation
    if (normalized.startsWith("go to") || normalized.includes("show me")) {
        if (normalized.includes("tasks")) return { type: "NAVIGATE", confidence: 0.9, payload: { path: "/tasks" }, originalQuery: query };
        if (normalized.includes("habits")) return { type: "NAVIGATE", confidence: 0.9, payload: { path: "/habits" }, originalQuery: query };
        if (normalized.includes("dashboard")) return { type: "NAVIGATE", confidence: 0.9, payload: { path: "/" }, originalQuery: query };
    }

    // 3. Task Creation (Quick Capture)
    if (normalized.startsWith("remind me to") || normalized.startsWith("add task") || normalized.startsWith("i need to")) {
        const title = query
            .replace(/remind me to/i, "")
            .replace(/add task/i, "")
            .replace(/i need to/i, "")
            .trim();

        return {
            type: "CREATE_TASK",
            confidence: 0.85,
            payload: { title },
            originalQuery: query
        };
    }

    // 4. Habit Logging
    if (normalized.includes("drank water") || normalized.includes("workout") || normalized.includes("meditated")) {
        return {
            type: "LOG_HABIT",
            confidence: 0.8,
            payload: { habit: normalized }, // Smart matching later
            originalQuery: query
        };
    }

    // Default: Fallback to Search or Chat
    return {
        type: "UNKNOWN",
        confidence: 0,
        payload: {},
        originalQuery: query
    };
}

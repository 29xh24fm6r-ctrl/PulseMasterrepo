import * as chrono from "chrono-node";

/**
 * Parse a natural language date/time phrase into an ISO string.
 * Uses user's locale/timezone assumptions via JS Date.
 * Canonical output: ISO string or null.
 */
export function parseNaturalDate(input: string, baseDate: Date = new Date()): string | null {
    if (!input?.trim()) return null;
    const parsed = chrono.parseDate(input, baseDate);
    if (!parsed) return null;
    const d = new Date(parsed);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
}

/**
 * Heuristic: determine whether a phrase sounds like a "snooze/defer" vs "due date".
 * - "in 2 hours", "snooze", "later", "not before" => defer
 * - "by Friday", "due", "deadline", explicit date => due
 */
export function classifyDateIntent(raw: string): "due" | "defer" {
    const s = raw.toLowerCase();
    if (/(snooze|later|not before|after|in \d+ (min|mins|minute|minutes|hour|hours|day|days|week|weeks))/i.test(s)) {
        return "defer";
    }
    return "due";
}

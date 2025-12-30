import "server-only";

export type SnoozePreset = "tomorrow_morning" | "in_3_days" | "next_week";

export function computeSnoozeDueAt(preset: SnoozePreset): string {
    const d = new Date();
    if (preset === "tomorrow_morning") {
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d.toISOString();
    }
    if (preset === "in_3_days") {
        d.setDate(d.getDate() + 3);
        d.setHours(9, 0, 0, 0);
        return d.toISOString();
    }
    // next_week
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
}

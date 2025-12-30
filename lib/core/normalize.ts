export function normalizeStatus(input: string | undefined, allowed: string[], fallback: string) {
    if (!input) return fallback;
    const v = input.trim().toLowerCase();
    return allowed.includes(v) ? v : fallback;
}

export function normalizeDueAt(input?: string | null): string | null {
    if (!input) return null;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

const KEYWORDS: Array<{ re: RegExp; label: string; seconds: number }> = [
    { re: /\bpreheat\b/i, label: "Preheat", seconds: 10 * 60 },
    { re: /\bboil\b/i, label: "Boil", seconds: 8 * 60 },
    { re: /\bsimmer\b/i, label: "Simmer", seconds: 7 * 60 },
    { re: /\bbake\b/i, label: "Bake", seconds: 12 * 60 },
    { re: /\broast\b/i, label: "Roast", seconds: 18 * 60 },
    { re: /\brest\b/i, label: "Rest", seconds: 5 * 60 },
    { re: /\bsaute\b|\bsauté\b/i, label: "Sauté", seconds: 6 * 60 },
];

export function suggestTimersForStep(stepText: string) {
    const out: Array<{ label: string; seconds: number }> = [];

    for (const k of KEYWORDS) {
        if (k.re.test(stepText)) out.push({ label: k.label, seconds: k.seconds });
    }

    // Always include universal quick timers
    out.push({ label: "2 min", seconds: 120 });
    out.push({ label: "5 min", seconds: 300 });

    const seen = new Set<string>();
    return out.filter((x) => (seen.has(x.label) ? false : (seen.add(x.label), true)));
}

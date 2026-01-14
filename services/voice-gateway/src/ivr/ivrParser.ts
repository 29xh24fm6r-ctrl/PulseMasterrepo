export type IvrOption =
    | { kind: "DTMF"; value: string; label: string }
    | { kind: "SAY"; value: string; label: string };

export type IvrDecision =
    | { type: "WAIT"; reason: string }
    | { type: "DTMF"; digits: string; reason: string; options: IvrOption[]; prompt: string }
    | { type: "SAY"; text: string; reason: string; options: IvrOption[]; prompt: string }
    | { type: "HUMAN_DETECTED"; reason: string; prompt: string };

export function parseIvrOptions(prompt: string): IvrOption[] {
    const p = normalize(prompt);
    const options: IvrOption[] = [];

    // Patterns like: "Press 1 for reservations", "For billing, press 2"
    // press (\d) for (.*)
    const pressFor = [...p.matchAll(/press\s+(\d|\*|#)\s+for\s+([a-z0-9 \-']{2,60})/g)];
    for (const m of pressFor) {
        options.push({ kind: "DTMF", value: m[1], label: m[2].trim() });
    }

    // for X press Y
    const forPress = [...p.matchAll(/for\s+([a-z0-9 \-']{2,60}),?\s+press\s+(\d|\*|#)/g)];
    for (const m of forPress) {
        options.push({ kind: "DTMF", value: m[2], label: m[1].trim() });
    }

    // say 'billing'
    const sayQuoted = [...p.matchAll(/say\s+['"]?([a-z][a-z0-9 \-']{1,40})['"]?/g)];
    for (const m of sayQuoted) {
        const label = m[1].trim();
        // avoid adding random "say" instances if no menu-like text exists
        options.push({ kind: "SAY", value: label, label });
    }

    // de-dupe
    return dedupe(options);
}

export function decideIvrAction(prompt: string, intentSummary: string): IvrDecision {
    const normPrompt = normalize(prompt);

    // Human detection heuristic:
    // If prompt contains "how can I help" or looks like a human greeting
    if (/(how can i help|how may i help|this is|speaking|can i help you|what can i do for you)/.test(normPrompt)) {
        return { type: "HUMAN_DETECTED", reason: "Human-like greeting detected", prompt };
    }

    const options = parseIvrOptions(prompt);

    // If no options, keep listening
    if (options.length === 0) {
        return { type: "WAIT", reason: "No IVR options parsed yet" };
    }

    // Pick best option by keyword overlap (Phase 3.1 simple + deterministic)
    const intent = normalize(intentSummary);
    let best: { option: IvrOption; score: number } | null = null;

    for (const opt of options) {
        const score = overlapScore(intent, normalize(opt.label));
        if (!best || score > best.score) best = { option: opt, score };
    }

    // If low confidence, fall back to common “representative/agent” choices if present
    if (!best || best.score < 1) {
        const agent = options.find((o) => /agent|representative|operator|customer service|front desk|reservations/.test(normalize(o.label)));
        if (agent) best = { option: agent, score: 1 };
    }

    if (!best) return { type: "WAIT", reason: "No decision candidate" };

    if (best.option.kind === "DTMF") {
        return {
            type: "DTMF",
            digits: best.option.value,
            reason: `Chose DTMF option "${best.option.label}"`,
            options,
            prompt
        };
    }

    return {
        type: "SAY",
        text: best.option.value,
        reason: `Chose SAY option "${best.option.label}"`,
        options,
        prompt
    };
}

// helpers
function normalize(s: string) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function dedupe(options: IvrOption[]) {
    const seen = new Set<string>();
    const out: IvrOption[] = [];
    for (const o of options) {
        const k = `${o.kind}:${o.value}:${o.label}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(o);
    }
    return out;
}
function overlapScore(a: string, b: string): number {
    const aw = new Set(a.split(" ").filter((x) => x.length > 2));
    const bw = new Set(b.split(" ").filter((x) => x.length > 2));
    let score = 0;
    for (const w of aw) if (bw.has(w)) score++;
    return score;
}

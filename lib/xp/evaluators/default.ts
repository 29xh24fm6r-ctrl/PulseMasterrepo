import type { Evaluator, Evidence } from "./types";

export const DefaultEvaluatorV1: Evaluator = {
    key: "xp.default",
    version: 1,
    evaluate: (evidence: Evidence) => {
        // deterministic baseline: map certain evidence types → XP
        const t = evidence.evidence_type;

        if (t === "workout.completed") {
            const minutes = Number(evidence.evidence_payload?.minutes ?? 0);
            const base = Math.max(10, Math.min(60, Math.round(minutes))); // cap
            return {
                xp: { xp_physical: base, xp_discipline: Math.round(base / 3) },
                meta: { confidence: Math.min(1, evidence.confidence), rule: "workout.completed.v1" },
            };
        }

        if (t === "deep_work.completed") {
            const minutes = Number(evidence.evidence_payload?.minutes ?? 0);
            const base = Math.max(10, Math.min(90, Math.round(minutes / 2)));
            return {
                xp: { xp_career: base, xp_discipline: Math.round(base / 4) },
                meta: { confidence: Math.min(1, evidence.confidence), rule: "deep_work.completed.v1" },
            };
        }

        // default: no XP
        return {
            xp: {},
            meta: { confidence: Math.min(1, evidence.confidence), rule: "no_match.v1" },
        };
    },
};

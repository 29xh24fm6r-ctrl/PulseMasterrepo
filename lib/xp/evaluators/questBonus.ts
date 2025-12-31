import type { Evaluator, Evidence } from "./types";

export const QuestBonusV1: Evaluator = {
    key: "quest.bonus",
    version: 1,
    evaluate: (evidence: Evidence) => {
        if (evidence.evidence_type !== "quest.completed") return { xp: {}, meta: { rule: "no_match" } };

        const questKey = String(evidence.evidence_payload?.quest_key ?? "");
        if (!questKey) return { xp: {}, meta: { rule: "missing_quest_key" } };

        // conservative baseline bonuses
        const bonus = questKey.includes("discipline") ? { xp_discipline: 5 } : { xp_identity: 3 };

        return { xp: bonus, meta: { rule: "quest.completed.bonus.v1", confidence: Math.min(1, evidence.confidence) } };
    },
};

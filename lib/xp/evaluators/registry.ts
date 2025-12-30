import type { Evaluator } from "./types";
import { DefaultEvaluatorV1 } from "./default";
import { QuestBonusV1 } from "./questBonus";

const evaluators: Evaluator[] = [DefaultEvaluatorV1, QuestBonusV1];

export function getEvaluator(key: string, version: number): Evaluator | null {
    return evaluators.find((e) => e.key === key && e.version === version) ?? null;
}

export function getActiveDefaultEvaluator(): Evaluator {
    // keep simple for now — later you can read xp_evaluators table
    return DefaultEvaluatorV1;
}

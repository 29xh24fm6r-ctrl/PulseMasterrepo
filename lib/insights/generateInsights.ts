import { PulseInsight } from "./types";

export function generateInsights(args: {
    attentionArtifacts: any[];
    runs: any[];
}): PulseInsight[] {
    const insights: PulseInsight[] = [];

    const reminderArtifacts = args.attentionArtifacts.filter(
        (a) => a.artifact_type === "reminder_candidate"
    );

    if (reminderArtifacts.length >= 3) {
        insights.push({
            type: "REPEATED_REMINDER_SIGNAL",
            confidence: Math.min(1, reminderArtifacts.length / 5),
            summary: `You’ve mentioned forgetting things like this ${reminderArtifacts.length} times recently.`,
            evidence: {
                count: reminderArtifacts.length,
                window_days: 7,
            },
        });
    }

    return insights;
}

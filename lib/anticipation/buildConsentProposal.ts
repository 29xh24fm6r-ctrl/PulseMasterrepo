export function buildConsentProposal(insight: any) {
    if (insight.type === "REPEATED_REMINDER_SIGNAL") {
        return {
            consent_type: "REMINDER_ASSIST",
            summary: "I can help by offering reminders when you say things like this.",
            scope: { trigger: "voice_forgetting_language" },
        };
    }
    return null;
}

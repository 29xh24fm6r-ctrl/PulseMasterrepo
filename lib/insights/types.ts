export type PulseInsight =
    | {
        type: "REPEATED_REMINDER_SIGNAL";
        confidence: number;
        summary: string;
        evidence: {
            count: number;
            window_days: number;
        };
    }
    | {
        type: "REPEATED_INTENT";
        confidence: number;
        summary: string;
        evidence: {
            intent_type: string;
            count: number;
        };
    };

export type Timestamp = number | string;

export type SignalBundle = {
    now: Timestamp;

    // Context
    active_surface?: string;            // "bridge" | "chat" | "brain" | ...
    active_environment?: string;        // "prod" | "staging" | "frontier" | ...
    current_mode?: string;             // "focus" | "explore" | ...

    // We define these as generic arrays for now, to be refined later
    sessions: any[];
    threads: any[];
    actions: any[];
    decisions: any[];
    blockers: any[];
    dependencies: any[];

    // User behavior
    user_events: any[];
    ignored_candidates: any[];

    // Optional metadata
    time_window?: { start: Timestamp, end: Timestamp };
};

export type Candidate = {
    key: string;                       // stable ID: "session:123", "action:abc"
    kind: string;                      // "session" | "action" | "decision" | "blocker" | "thread"
    title: string;
    summary?: string;

    // Links / refs
    ref_id: string;
    context_tags: string[];            // e.g. ["chat", "frontier", "client:XYZ"]

    // Computed
    score: number;                     // float
    confidence: number;                // 0..1
    reasons: string[];                 // 1-3
    recommended_action: RecommendedAction;
};

export type RecommendedAction = {
    label: string;                     // e.g. "Resume session", "Make decision", "Unblock"
    action_type: string;               // "resolve" | "advance" | "decide" | "defer"
    payload: Record<string, any>;      // UI-executable payload
};

export type NowResult =
    | {
        status: "resolved_now";
        primary_focus: Candidate;
        confidence_score: number;
        supporting_reasons: string[];
        recommended_action: RecommendedAction;
    }
    | {
        status: "no_clear_now";
        explanation: string;
        fallback_action?: RecommendedAction;
    }
    | {
        status: "deferred";
        last_known_focus?: Candidate;
        cooldown_until: Timestamp;
    };

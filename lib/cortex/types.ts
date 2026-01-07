export type CortexActionType =
    | "action_intercepted"
    | "system_event"
    | "user_activity"
    | "shadow_work";

export type CortexPriority = "critical" | "high" | "medium" | "low" | "background";

export interface CortexContext {
    userId: string;
    source: string; // e.g., "api/journal/save", "slack", "calendar"
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface CortexSignal {
    type: string;
    payload: any;
    context: CortexContext;
}

export interface CortexResponse {
    allowed: boolean;
    modifiedPayload?: any; // If the Cortex modified the payload
    sideEffects: CortexSideEffect[];
}

export interface CortexSideEffect {
    type: "draft_email" | "schedule_event" | "log_memory" | "notify_user";
    payload: any;
    status: "pending" | "completed" | "failed";
}

export interface InterceptorOptions {
    blocking?: boolean; // Wait for Cortex before proceeding?
    timeoutMs?: number;
}

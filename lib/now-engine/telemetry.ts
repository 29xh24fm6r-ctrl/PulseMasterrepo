import { NowStatus } from "./types";

export type TelemetryEventName =
    | "now_computed"
    | "now_presented"
    | "now_action_taken";

export interface NowComputedEvent {
    event: "now_computed";
    now_status: NowStatus;
    primary_candidate_id?: string;
    confidence?: number;
    signal_snapshot: {
        task_count: number;
        has_focus: boolean;
        time_bucket?: string;
    };
    engine_version: string;
    timestamp: number;
}

export interface NowPresentedEvent {
    event: "now_presented";
    now_status: NowStatus;
    ui_state: string;
    timestamp: number;
}

export interface NowActionTakenEvent {
    event: "now_action_taken";
    action_id: string;
    intent: string;
    source: "primary" | "secondary" | "chip";
    timestamp: number;
}

export type NowTelemetryEvent =
    | NowComputedEvent
    | NowPresentedEvent
    | NowActionTakenEvent;

/**
 * Async, fire-and-forget telemetry logger.
 * Captures "Why" a decision was made and "What" happened next.
 * Never throws, never blocks.
 */
export async function logNowEvent(payload: NowTelemetryEvent): Promise<void> {
    try {
        // In a real production system, this would push to an analytics endpoint,
        // (e.g. PostHog, Segment, or a custom /api/telemetry route).
        // For now, we log to console in a distinct accessible way for observation 
        // without cluttering standard logs too much, or use a specific debug prefix.

        // We ensure this is strictly non-blocking by wrapping in a 0-delay timeout 
        // if we were doing heavy lifting, but console.log is native.
        // To strictly "never block rendering" we trust the JS event loop.

        // Construct a safe log object
        const logEntry = {
            ...payload,
            _timestamp_iso: new Date(payload.timestamp).toISOString(),
            _log_type: "[PULSE_TELEMETRY]"
        };

        // Development/Preview visibility
        if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS) {
            console.groupCollapsed(`[Pulse Telemetry] ${payload.event}`);
            console.log(logEntry);
            console.groupEnd();
        }

        // TODO: Wire to /api/activity/track or similar if persistence is required in Phase J
        // For Phase J spec: "Confirm events fire" implies observability.

    } catch (e) {
        // Silent drop as per spec ("Failure to log is silent")
        // No-op
    }
}

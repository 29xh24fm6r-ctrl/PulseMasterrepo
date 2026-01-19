export type ObserverEventType =
    | "route"
    | "click"
    | "input"
    | "keydown"
    | "network"
    | "error"
    | "unhandledrejection"
    | "perf"
    | "note"
    | "inability";

export type ObserverEvent = {
    id: string;
    ts: number; // Date.now()
    type: ObserverEventType;
    route?: string;
    message?: string;
    reason?: string;
    confidence?: string;
    resolved?: boolean;
    meta?: Record<string, any>;
};

export type ObserverBundle = {
    app: {
        name: "Pulse";
        buildId?: string;
        env: "dev" | "preview" | "prod";
        userAgent: string;
        locale?: string;
        tz?: string;
    };
    session: {
        startedAt: number;
        endedAt?: number;
        durationMs?: number;
        routeAtExport?: string;
    };
    events: ObserverEvent[];
    summary: {
        routes: string[];
        errors: { count: number; last?: string };
        network: { failures: number; lastFailure?: string };
        interactions: { clicks: number; inputs: number; keydowns: number };
    };
};

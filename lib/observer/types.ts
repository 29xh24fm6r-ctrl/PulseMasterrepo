export type ObserverEventType =
    | "route"
    | "click"
    | "input"
    | "keydown"
    | "network"
    | "error"
    | "unhandledrejection"
    | "perf"
    | "note";

export type ObserverEvent = {
    id: string;
    ts: number; // Date.now()
    type: ObserverEventType;
    route?: string;
    message?: string;
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

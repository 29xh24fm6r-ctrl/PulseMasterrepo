export type PresenceMsg =
    | { type: "presence:hello"; from: "presence"; ts: number }
    | { type: "presence:ping"; from: "main"; ts: number }
    | { type: "presence:state"; from: "main"; ts: number; payload: PresenceState }
    | { type: "presence:event"; from: "main"; ts: number; payload: PresenceEvent }
    | { type: "presence:error"; from: "main"; ts: number; payload: PresenceError };

export type PresenceState = {
    route: string;
    userHint?: string; // optional: email/uuid display only if safe
    envHint?: string;  // optional: "preview" | "production" | "dev"
};

export type PresenceEvent = {
    id: string;
    ts: number;
    kind: "route" | "network" | "perf" | "ui" | "error" | "custom";
    route?: string;
    label?: string;
    meta?: Record<string, unknown>;
};

export type PresenceError = {
    ts: number;
    route?: string;
    message: string;
    stack?: string;
    source?: string; // "SystemBanner", "window.onerror", etc.
};

export type ExecutionKind =
    | "email.flush"
    | "inbox.triage"
    | "quest.refresh_today"
    | "quest.compute"
    | "xp.replay.worker"
    | "nudge.send";

export type ExecutionPayload = Record<string, any>;

export type ExecutionJob = {
    id: string;
    kind: ExecutionKind;
    payload: ExecutionPayload;
    run_at: string;
    priority: number;
    attempts: number;
    max_attempts: number;
};

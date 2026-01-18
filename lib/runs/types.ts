// lib/runs/types.ts
export type RunKind = "oracle" | "voice" | "tool" | "system";
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type RunEventType =
    | "RUN_STARTED"
    | "INPUT_ACCEPTED"
    | "STEP_STARTED"
    | "STEP_LOG"
    | "STEP_DONE"
    | "RUN_DONE"
    | "RUN_FAILED";

export type PulseIntent =
    | { type: "RUN_ORACLE"; confidence: number; oracle_id: string; args?: Record<string, any> }
    | { type: "NAVIGATE"; confidence: number; path: string }
    | { type: "CREATE_REMINDER"; confidence: number; content: string; when?: string }
    | { type: "PURCHASE_PREPARE"; confidence: number; merchant_key: string; category: string; amount_cents?: number }
    | { type: "UNKNOWN"; confidence: number; reason?: string };

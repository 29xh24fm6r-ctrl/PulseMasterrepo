// lib/features/canary.types.ts

export type CanaryFixHint = {
  kind:
    | "MISSING_TABLE"
    | "RLS_DENIED"
    | "API_DOWN"
    | "MISSING_ENV"
    | "JOB_QUEUE_DOWN"
    | "UNKNOWN";
  summary: string;
  nextSteps?: string[];
  owners?: string[]; // feature/team ids if you want later
  filePaths?: string[]; // optional "jump to file" hints
  evidence?: any;
};

export type CanaryCheck = {
  id: string;
  label: string;
  ok: boolean;
  details?: string;
  evidence?: any;
  fixHint?: CanaryFixHint;
};

export type CanaryResult = {
  featureId: string;
  ok: boolean;
  severity: "ok" | "warn" | "fail";
  checks: CanaryCheck[];
  notes?: string[];
  createdAt: string; // ISO
  lastOkAt?: string; // optional if you already compute it
};

export type CanaryContext = {
  clerkUserId: string; // "ci-system" when CI token auth is used
};

export type CanaryFn = (ctx: CanaryContext) => Promise<CanaryResult>;
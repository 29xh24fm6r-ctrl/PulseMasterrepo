export type CanaryCheckResult = {
    name: string;
    ok: boolean;
    ms: number;
    detail?: string;
};

export type CanaryReport = {
    ok: boolean;
    release: string;
    env: string;
    ran_at: string;
    total_ms: number;
    checks: CanaryCheckResult[];
};

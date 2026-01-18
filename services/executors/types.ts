export type ExecutorResult = {
    ok: boolean;
    output?: any;
    error?: any;
    retryable?: boolean;
};

export type JobStatus = 'ready' | 'running' | 'done' | 'dead' | 'retrying';

export interface ExecutorJob {
    id: string;
    job_kind: string;
    payload_json: any;
    run_id: string;
    attempt: number;
}

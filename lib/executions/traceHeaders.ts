export function readTraceHeaders(req: Request) {
    const traceId = req.headers.get("x-trace-id");
    const executionId = req.headers.get("x-execution-id");
    return { traceId, executionId };
}

export function traceFromBody(body: any): { traceId: string | null; executionId: string | null; executionRunId: string | null } {
    if (!body || typeof body !== "object") return { traceId: null, executionId: null, executionRunId: null };
    return {
        traceId: body.trace_id ? String(body.trace_id) : null,
        executionId: body.execution_id ? String(body.execution_id) : null,
        executionRunId: body.execution_run_id ? String(body.execution_run_id) : null,
    };
}

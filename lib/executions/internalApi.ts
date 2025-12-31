export function getInternalBaseUrl() {
    const envUrl =
        process.env.PULSE_INTERNAL_BASE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL?.startsWith("http")
            ? process.env.VERCEL_URL
            : process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : null);

    return envUrl ?? "http://localhost:3000";
}

export async function internalPost(
    path: string,
    body: any,
    opts?: { traceId?: string | null; executionId?: string | null; executionRunId?: string | null }
) {
    const base = getInternalBaseUrl();
    const url = new URL(path, base).toString();

    const traceId = opts?.traceId ?? null;
    const executionId = opts?.executionId ?? null;

    const mergedBody = {
        ...(body ?? {}),
        ...(traceId ? { trace_id: traceId } : {}),
        ...(executionId ? { execution_id: executionId } : {}),
        ...(opts?.executionRunId ? { execution_run_id: opts.executionRunId } : {}),
    };

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(traceId ? { "x-trace-id": traceId } : {}),
            ...(executionId ? { "x-execution-id": executionId } : {}),
        },
        body: JSON.stringify(mergedBody),
    });

    const text = await res.text();
    let json: any = null;
    try {
        json = JSON.parse(text);
    } catch {
        json = { raw: text };
    }

    if (!res.ok) {
        throw new Error(`internalPost ${path} failed: ${res.status} ${json?.error ?? text}`);
    }

    return json;
}

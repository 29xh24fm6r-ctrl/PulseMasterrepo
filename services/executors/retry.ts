export function calculateNextRetry(attempt: number): Date {
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s...
    const delaySeconds = Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    const now = new Date();
    now.setSeconds(now.getSeconds() + delaySeconds);
    now.setMilliseconds(now.getMilliseconds() + jitter);
    return now;
}

export function isRetryableError(error: any): boolean {
    if (!error) return false;
    const msg = (error.message || JSON.stringify(error)).toLowerCase();

    // Explicit non-retryable
    if (msg.includes("auth") || msg.includes("permission") || msg.includes("invalid input")) return false;

    // Retryable signals
    if (msg.includes("timeout")) return true;
    if (msg.includes("rate limit") || msg.includes("429")) return true;
    if (msg.includes("network")) return true;
    if (msg.includes("connection reset")) return true;

    // Default to strict (no retry) if unknown, unless it's a 5xx
    if (error.status && error.status >= 500) return true;

    return false;
}

import { ExecutorResult } from "../types";

export async function runPlaywrightJob(args: {
    run_id: string;
    payload: any;
}): Promise<ExecutorResult> {
    // V1 Stub: Real browser automation to be added in next iteration
    // Must respect EXEC_WEB_ALLOWED_DOMAINS

    const allowed = (process.env.EXEC_WEB_ALLOWED_DOMAINS || "").split(",");
    const targetUrl = args.payload.url;

    if (!targetUrl) return { ok: false, error: "No URL provided" };

    // Check allowlist
    const urlObj = new URL(targetUrl);
    if (!allowed.some(d => urlObj.hostname.endsWith(d.trim()))) {
        return { ok: false, error: "Domain not allowed", retryable: false };
    }

    // Simulate work
    return {
        ok: true,
        output: {
            method: "playwright_stub",
            screenshot_url: "placeholder",
            title: "Simulated Page Title"
        }
    };
}

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mkRunId() {
    return `qa_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * OBS QA ENDPOINT (prod-safe)
 * - Enabled only when OBS_QA_ENABLED=true
 * - Lets us deterministically test: error capture, latency, breadcrumbs, spans, releases
 *
 * Query params:
 *  - mode=ok|error|latency
 *  - ms=<number> (for latency)
 */
export async function GET(req: Request) {
    const enabled = process.env.OBS_QA_ENABLED === "true";
    if (!enabled) {
        return NextResponse.json({ ok: false, error: "OBS QA disabled" }, { status: 404 });
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "ok";
    const ms = Number(url.searchParams.get("ms") ?? "250");
    const run_id = req.headers.get("x-obs-qa-run-id") ?? mkRunId();

    return await Sentry.startSpan({ name: "obs.qa", op: "pulse.qa" }, async () => {
        Sentry.setTag("obs_qa_run_id", run_id);

        Sentry.addBreadcrumb({
            category: "obs.qa",
            message: `QA mode=${mode}`,
            level: "info",
            data: {
                ms,
                mode,
                run_id,
                release: process.env.NEXT_PUBLIC_PULSE_RELEASE,
                env: process.env.NODE_ENV
            },
        });

        if (mode === "latency") {
            await new Promise((r) => setTimeout(r, Math.max(0, Math.min(ms, 15000))));
            const res = NextResponse.json({ ok: true, mode, slept_ms: ms, run_id });
            res.headers.set("x-obs-qa-run-id", run_id);
            return res;
        }

        if (mode === "error") {
            // deterministic test error (shows up in Sentry)
            throw new Error("OBS QA TEST ERROR");
        }

        const res = NextResponse.json({
            ok: true,
            mode,
            run_id,
            release: process.env.NEXT_PUBLIC_PULSE_RELEASE ?? "unknown",
            env: process.env.NODE_ENV ?? "unknown",
            ts: new Date().toISOString(),
        });
        res.headers.set("x-obs-qa-run-id", run_id);
        return res;
    });
}

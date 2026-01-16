import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { checkSupabase } from "@/services/observability/canary/checkSupabase";
import { checkEmail } from "@/services/observability/canary/checkEmail";
import { checkOpenAI } from "@/services/observability/canary/checkOpenAI";
import type { CanaryReport } from "@/services/observability/canary/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily Canary
 * - Called by Vercel Cron (HTTP GET)
 * - Protected by CRON_SECRET in query string
 * - Emits Sentry Cron Monitoring check-ins
 * - Runs non-destructive dependency smoke tests
 */

function requireCronAuth(req: Request) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;

    if (!expected) return { ok: false as const, status: 500, msg: "CRON_SECRET not set" };
    if (!secret || secret !== expected) return { ok: false as const, status: 401, msg: "Unauthorized" };

    return { ok: true as const };
}

export async function GET(req: Request) {
    if (process.env.DAILY_CANARY_ENABLED !== "true") {
        return NextResponse.json({ ok: false, error: "Daily canary disabled" }, { status: 404 });
    }

    const auth = requireCronAuth(req);
    if (!auth.ok) {
        return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status });
    }

    // Sentry Cron Monitor slug — create this monitor in Sentry UI with same slug
    const monitorSlug = "pulse-daily-canary";

    // “in_progress” check-in
    const checkInId = Sentry.captureCheckIn({
        monitorSlug,
        status: "in_progress",
    });

    const startedAt = Date.now();

    try {
        const release = process.env.NEXT_PUBLIC_PULSE_RELEASE ?? "unknown";
        const env = process.env.NODE_ENV ?? "unknown";

        const checks = [];

        if (process.env.CANARY_SUPABASE_ENABLED === "true") checks.push(await checkSupabase());
        if (process.env.CANARY_EMAIL_ENABLED === "true") checks.push(await checkEmail());
        if (process.env.CANARY_OPENAI_ENABLED === "true") checks.push(await checkOpenAI());

        const durationMs = Date.now() - startedAt;
        const allOk = checks.every((c) => c.ok);

        const report: CanaryReport = {
            ok: allOk,
            release,
            env,
            ran_at: new Date().toISOString(),
            total_ms: durationMs,
            checks,
        };

        // Attach structured evidence
        Sentry.setTag("canary", "daily");
        Sentry.setTag("canary_ok", allOk ? "true" : "false");
        Sentry.setContext("canary_report", report);

        // Also breadcrumb for quick glance
        Sentry.addBreadcrumb({
            category: "canary",
            message: allOk ? "Daily canary OK" : "Daily canary FAILED",
            level: allOk ? "info" : "error",
            data: report,
        });

        Sentry.captureCheckIn({
            checkInId,
            monitorSlug,
            status: allOk ? "ok" : "error",
            duration: durationMs / 1000,
        });

        // If failed, emit an exception to surface in Issues (with context attached)
        if (!allOk) {
            Sentry.captureException(new Error("Daily canary dependency check failed"));
        }

        // Important on serverless: flush so the envelope actually ships
        await Sentry.flush(2000);

        return NextResponse.json(report, { status: allOk ? 200 : 500 });
    } catch (err) {
        const durationMs = Date.now() - startedAt;

        // “error” check-in
        Sentry.captureCheckIn({
            checkInId,
            monitorSlug,
            status: "error",
            duration: durationMs / 1000,
        });

        // Record the underlying error too
        Sentry.captureException(err);

        await Sentry.flush(2000);

        return NextResponse.json(
            {
                ok: false,
                monitor: monitorSlug,
                duration_ms: durationMs,
                error: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

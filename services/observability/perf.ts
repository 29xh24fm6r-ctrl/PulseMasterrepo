import * as Sentry from "@sentry/nextjs";

export async function withPerf<T>(
    name: string,
    fn: () => Promise<T>,
    data?: Record<string, any>
): Promise<T> {
    return await Sentry.startSpan(
        { name, op: "pulse.perf", attributes: data ?? {} },
        async () => {
            const t0 = Date.now();
            try {
                const out = await fn();
                Sentry.setMeasurement(`${name}.ms`, Date.now() - t0, "millisecond");
                return out;
            } catch (e) {
                Sentry.setMeasurement(`${name}.ms`, Date.now() - t0, "millisecond");
                throw e;
            }
        }
    );
}

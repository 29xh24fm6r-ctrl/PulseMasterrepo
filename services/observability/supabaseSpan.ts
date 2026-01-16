import * as Sentry from "@sentry/nextjs";

export async function supabaseSpan<T>(
    name: string,
    fn: () => Promise<T>,
    meta?: Record<string, any>
): Promise<T> {
    return await Sentry.startSpan(
        { name, op: "db.supabase", attributes: meta ?? {} },
        async () => await fn()
    );
}

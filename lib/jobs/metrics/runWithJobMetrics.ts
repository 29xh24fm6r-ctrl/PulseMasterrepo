import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function runWithJobMetrics<T>(
    jobName: string,
    fn: () => Promise<T>
): Promise<T> {
    const start = performance.now();
    const supabase = getSupabaseAdminRuntimeClient(); // Get client

    try {
        const res = await fn();
        await supabase.from("job_metrics").insert({
            job_name: jobName,
            duration_ms: Math.round(performance.now() - start),
            success: true,
            error: null,
        });
        return res;
    } catch (e: any) {
        await supabase.from("job_metrics").insert({
            job_name: jobName,
            duration_ms: Math.round(performance.now() - start),
            success: false,
            error: String(e?.message ?? e),
        });
        throw e;
    }
}

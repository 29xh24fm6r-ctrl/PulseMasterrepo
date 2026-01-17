import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export type ExecLogLevel = "info" | "warn" | "error";

export async function execLog(params: {
    userId: string;
    executionId: string;
    traceId?: string | null;
    level?: ExecLogLevel;
    message: string;
    meta?: Record<string, any>;
}) {
    const { userId, executionId, traceId = null, level = "info", message, meta = {} } = params;

    // Best-effort logging: never throw
    try {
        await getSupabaseAdminRuntimeClient().from("execution_logs").insert({
            user_id: userId,
            execution_id: executionId,
            trace_id: traceId,
            level,
            message,
            meta,
        });
    } catch {
        // ignore
    }
}

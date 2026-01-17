import { CanaryCheckResult } from "./types";
import { withTimeout } from "./timeout";

// Using the project's standard admin client
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function checkSupabase(): Promise<CanaryCheckResult> {
    const started = Date.now();
    const timeoutMs = Number(process.env.CANARY_SUPABASE_TIMEOUT_MS ?? "2500");

    try {
        await withTimeout("supabase", timeoutMs, async () => {
            // Preferred: RPC ping (create later if you want)
            const { data: rpcData, error: rpcErr } = await getSupabaseAdminRuntimeClient().rpc("canary_ping");
            if (!rpcErr) return rpcData;

            // Fallback: configurable lightweight select
            const table = process.env.CANARY_SUPABASE_TABLE;
            if (!table) throw rpcErr ?? new Error("No canary_ping RPC and CANARY_SUPABASE_TABLE not set");

            // Minimal fetch
            const { error: selErr } = await getSupabaseAdminRuntimeClient().from(table).select("*", { count: "exact", head: true }).limit(1);
            if (selErr) throw selErr;
        });

        return { name: "supabase", ok: true, ms: Date.now() - started };
    } catch (e) {
        return {
            name: "supabase",
            ok: false,
            ms: Date.now() - started,
            detail: e instanceof Error ? e.message : "Unknown error",
        };
    }
}

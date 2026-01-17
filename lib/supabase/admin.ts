import { getRuntimePhase } from "@/lib/env/runtime-phase";

export async function supabaseAdmin() {
    if (getRuntimePhase() === "build") {
        throw new Error("Supabase Admin client requested during build phase");
    }

    const { getSupabaseAdminRuntimeClient } = await import("@/lib/runtime/supabase.runtime");
    return getSupabaseAdminRuntimeClient();
}

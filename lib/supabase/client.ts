
import { getRuntimePhase } from "@/lib/env/runtime-phase";

export async function createClient() {
    if (getRuntimePhase() === "build") {
        // Return a mock or throw? Client side usually safe but this export might be used in server components.
        // Best to be safe.
        return null;
    }
    const { getSupabaseRuntimeClient } = await import("@/lib/runtime/supabase.runtime");
    return getSupabaseRuntimeClient();
}

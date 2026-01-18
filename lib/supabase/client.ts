
import { getRuntimePhase } from "@/lib/env/runtime-phase";

import { getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";

export function createClient() {
    if (getRuntimePhase() === "build") {
        // Return a dummy object during build to prevent calls like .channel() from crashing
        // if they are reached during render (though useEffect skips them).
        return {} as any;
    }
    return getSupabaseRuntimeClient();
}

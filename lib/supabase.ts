/**
 * LEGACY EXCEPTION (Phase 3A):
 * Refactored to be runtime-safe.
 */
import type { Database } from '../types/supabase'

// Factory functions for runtime initialization (Build safe)
export async function createBrowserClient() {
    if (typeof window === 'undefined') return null; // Server side check roughly
    const { getSupabaseRuntimeClient } = await import('@/lib/runtime/supabase.runtime');
    return getSupabaseRuntimeClient();
}

export async function createAdminClient() {
    const { getSupabaseAdminRuntimeClient } = await import('@/lib/runtime/supabase.runtime');
    return getSupabaseAdminRuntimeClient();
}

// DEPRECATED SINGLETONS
// These will throw if accessed. Consumers must migrate to `await getSupabaseRuntimeClient()`
export const supabase = new Proxy({}, {
    get: () => {
        throw new Error("Generic 'supabase' export is deprecated. Use `await import('@/lib/runtime/supabase.runtime')`");
    }
});

export const supabaseAdmin = new Proxy({}, {
    get: () => {
        throw new Error("Generic 'supabaseAdmin' export is deprecated. Use `await import('@/lib/runtime/supabase.runtime')`");
    }
});


import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'
import { getSupabaseUrl, getSupabaseAnonKey, getServiceRoleKey } from './env'

// Factory functions for runtime initialization (Build safe)
export function createBrowserClient() {
    return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}

export function createAdminClient() {
    return createClient<Database>(getSupabaseUrl(), getServiceRoleKey());
}

// Global Singletons (May throw at runtime if env missing, but now safeguarded by env.ts getters if imported)
// We use a try-catch pattern or just standard init to maintain compatibility
// Global Singletons (Lazy Proxies to prevent build-time crashes)
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
    get: (_target, prop) => {
        if (!supabaseInstance) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
            const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
            supabaseInstance = createClient<Database>(url, anon);
        }
        return (supabaseInstance as any)[prop];
    }
});

let adminInstance: ReturnType<typeof createClient<Database>> | null = null;
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
    get: (_target, prop) => {
        if (!adminInstance) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
            const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
            adminInstance = createClient<Database>(url, service);
        }
        return (adminInstance as any)[prop];
    }
});


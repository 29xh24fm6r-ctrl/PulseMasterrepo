
/**
 * Environment Variable Accessors
 * To prevent build-time crashes when env vars are missing.
 */

export function getSupabaseUrl(): string {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing');
    }
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
    }
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getServiceRoleKey(): string {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
    }
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

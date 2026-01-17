
/**
 * Environment Variable Accessors
 * To prevent build-time crashes when env vars are missing.
 */

import { isBuildPhase } from "@/lib/env/guard";

export function getSupabaseUrl(): string {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (isBuildPhase()) return "https://placeholder.supabase.co";
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing');
    }
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        if (isBuildPhase()) return "placeholder-key";
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
    }
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getServiceRoleKey(): string {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        if (isBuildPhase()) return "placeholder-service-key";
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
    }
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
}


import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
    const cookieStore = cookies()

    // Build-safe env access
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Fallback for CI/Build
    const safeUrl = (process.env.CI || !url) ? (url || "http://localhost:54321") : url;
    const safeAnon = (process.env.CI || !anon) ? (anon || "placeholder-anon-key") : anon;

    if (!process.env.CI && (!url || !anon)) {
        // In production runtime (not CI), we want to throw or log if missing
        if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
        if (!anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    return createServerClient(
        safeUrl,
        safeAnon,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}


import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { isBuildPhase } from "@/lib/env/guard";

export function createClient() {
    const cookieStore = cookies()

    // Build-safe env access
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        if (isBuildPhase()) {
            // Return dummy client during build/CI to prevent crash
            return createServerClient(
                "https://example.supabase.co",
                "dummy-key",
                {
                    cookies: {
                        get: () => undefined,
                        set: () => { },
                        remove: () => { },
                    },
                    global: {
                        fetch: (...args) => Promise.reject(new Error("Supabase Build-Time Mock: Request Blocked")),
                    },
                }
            );
        }
        // In runtime production, missing keys should fail hard (or typically throw)
        // But createServerClient might throw if we pass undefined. 
        // We throw a clear error here.
        throw new Error("Supabase credentials missing in runtime environment");
    }

    return createServerClient(
        url,
        key,
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

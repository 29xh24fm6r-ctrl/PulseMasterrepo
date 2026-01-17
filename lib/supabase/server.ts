
import { type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getRuntimePhase } from "@/lib/env/runtime-phase";

export async function createClient() {
    if (getRuntimePhase() === "build") {
        throw new Error("Server Supabase client requested during build phase");
    }

    const { createServerClient } = await import('@supabase/ssr');

    const cookieStore = await cookies(); // Next 15: cookies() is async
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createServerClient(
        url,
        anon,
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

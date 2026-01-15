import { useState, useEffect } from 'react';
import { NowResult } from '@/lib/now-engine/types';

export function useNowEngine() {
    const [result, setResult] = useState<NowResult | null>(null);

    useEffect(() => {
        async function fetchNow() {
            // 1. Check Auth (Task F.2)
            const userId = localStorage.getItem('pulse_owner_user_id');
            if (!userId) {
                setResult({
                    status: 'auth_missing',
                    message: 'Missing pulse_owner_user_id in localStorage',
                });
                return;
            }

            // 2. Fetch with Error Handling
            try {
                const headers: HeadersInit = {};
                if (process.env.NODE_ENV === "development" && userId) {
                    headers['x-pulse-dev-user-id'] = userId;
                }

                const res = await fetch('/api/pulse/now', { headers });
                if (res.ok) {
                    const data = await res.json();

                    // Task F.3: Basic contract validation could trigger here
                    if (data && data.status) {
                        setResult(data);
                    } else {
                        throw new Error("Invalid API response shape");
                    }

                } else {
                    throw new Error(`API Error: ${res.status} ${res.statusText}`);
                }
            } catch (e: any) {
                console.error("Failed to fetch Now state", e);
                setResult({
                    status: 'fetch_error',
                    message: e.message || "Unknown connectivity error",
                    retryable: true
                });
            }
        }
        fetchNow();
    }, []);

    // Debug methods can still stick around if we want
    const _debugForceState = (s: any) => console.log("Force state not supported in real hook yet");

    return result || {
        status: 'no_clear_now',
        explanation: 'Loading intelligence...',
        fallback_action: undefined
    } as NowResult;
}

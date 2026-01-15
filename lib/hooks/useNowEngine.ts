import { useState, useEffect } from 'react';
import { NowResult } from '@/lib/now-engine/types';

export function useNowEngine() {
    const [result, setResult] = useState<NowResult | null>(null);

    useEffect(() => {
        async function fetchNow() {
            try {
                const res = await fetch('/api/pulse/now');
                if (res.ok) {
                    const data = await res.json();
                    setResult(data);
                }
            } catch (e) {
                console.error("Failed to fetch Now state", e);
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

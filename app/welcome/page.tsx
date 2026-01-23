"use client";

import { WelcomeSurface } from "@/components/welcome/WelcomeSurface";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
    // ✅ Fix: Use Client-Side Authority (Clerk) instead of Server Roundtrip (WhoAmI)
    // This prevents race conditions where cookies aren't ready yet.
    const { isLoaded, isSignedIn } = useUser();
    const router = useRouter();
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [debugInfo, setDebugInfo] = useState<string>('');
    const didRunRef = useRef(false);

    // 1. Sync Logic (Idempotent)
    const runSync = async () => {
        setSyncState('syncing');
        try {
            const res = await fetch('/api/user/sync', { method: 'POST', credentials: 'include' });
            const data = await res.json();

            if (data.ok) {
                setSyncState('success');
            } else {
                setSyncState('error');
                setDebugInfo(data.debugId || data.code || 'UNKNOWN_ERROR');
            }
        } catch (e: any) {
            setSyncState('error');
            setDebugInfo(e.message || 'NETWORK_ERROR');
        }
    };

    // 2. Trigger Sync on Mount (once signed in)
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        if (didRunRef.current) return;

        didRunRef.current = true;
        runSync();
    }, [isLoaded, isSignedIn]);

    // 3. Render

    // Auth Loading (Clerk)
    if (!isLoaded) return <div className="min-h-screen bg-black" />;

    // 🛑 STOP LOGIC: If not signed in, DO NOT REDIRECT AUTOMATICALLY.
    // This breaks the "/welcome -> /sign-in -> /welcome" loop.
    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
                    <p className="text-zinc-400 mb-6">
                        to continue setup.
                    </p>
                    <a
                        href="/sign-in"
                        className="inline-flex w-full items-center justify-center py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                        Sign In
                    </a>
                </div>
            </div>
        );
    }

    // Sync Loading
    if (syncState === 'syncing' || syncState === 'idle') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800" />
                    <div className="text-zinc-500 text-sm">Setting up your Pulse...</div>
                </div>
            </div>
        );
    }

    // Sync Error -> PROVISIONING GATE (Stop the loop!)
    if (syncState === 'error') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">Setup Failed</h2>
                    <p className="text-zinc-400 mb-6">
                        We couldn't provision your account data. This prevents the dashboard from loading correctly.
                    </p>

                    <div className="bg-black rounded-lg p-3 font-mono text-xs text-zinc-600 mb-6 break-all">
                        ID: {debugInfo}
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                setSyncState('idle'); // Reset state to re-trigger
                                didRunRef.current = false;
                            }}
                            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.href = '/sign-in'}
                            className="w-full py-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Success -> Render Actual Surface
    return <WelcomeSurface />;
}

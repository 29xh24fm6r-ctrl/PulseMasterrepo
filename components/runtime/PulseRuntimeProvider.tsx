"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import * as client from "@/lib/runtime/client";
import { useOverlays } from "@/components/shell/overlays/OverlayContext";
import {
    LifeState,
    TrendPoint,
    NotableEvent,
    PlanSection,
    ObserverData,
    Message
} from "@/lib/runtime/types";
import { v4 as uuidv4 } from 'uuid';

interface PulseRuntimeContextType {
    lifeState: LifeState;
    trends: Record<string, TrendPoint[]>;
    notables: NotableEvent[];
    planLedger: PlanSection[];
    observerData: ObserverData;
    messages: Message[];
    sendBridgeMessage: (text: string) => void;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const PulseRuntimeContext = createContext<PulseRuntimeContextType | undefined>(undefined);

import { usePresencePublisher } from "@/lib/presence/usePresencePublisher";
import { usePresenceErrorCapture } from "@/lib/presence/usePresenceErrorCapture";

// Helper for safe fetching
async function safeFetchJSON(url: string) {
    try {
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) return { ok: false as const, status: res.status };
        const data = await res.json();
        return { ok: true as const, data };
    } catch (e) {
        return { ok: false as const, error: String(e) };
    }
}

export function PulseRuntimeProvider({ children }: { ReactNode }) {
    // 📢 PRESENCE SHELL PUBLISHER (v1)
    usePresencePublisher();
    usePresenceErrorCapture();

    const { setIPPActive, showBanner } = useOverlays();

    // Default safe state to avoid UI crashes before first fetch
    const [lifeState, setLifeState] = useState<LifeState>({
        energy: 'Medium', stress: 'Medium', momentum: 'Medium', orientation: "Connecting..."
    });
    const [trends, setTrends] = useState<Record<string, TrendPoint[]>>({});
    const [notables, setNotables] = useState<NotableEvent[]>([]);
    const [planLedger, setPlanLedger] = useState<PlanSection[]>([]);
    const [observerData, setObserverData] = useState<ObserverData>({
        runtime: [], autonomy: [], effects: [], ipp: [], background: []
    });

    const [messages, setMessages] = useState<Message[]>([
        { id: 'init-1', content: "Good morning. Connecting to Pulse.", role: 'pulse', timestamp: new Date() }
    ]);
    const [isLoading, setIsLoading] = useState(true);

    const [runtimeMode, setRuntimeMode] = useState<'live' | 'preview' | 'paused' | 'auth_missing'>('live');

    const handleError = useCallback((err: any) => {
        console.error("Runtime Provider Error:", err);
        // Fallback to paused safely instead of crash
        setRuntimeMode('paused');
    }, []);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Check Truth Endpoint (WhoAmI)
            const whoami = await safeFetchJSON('/api/runtime/whoami');

            // If we can't even reach whoami, or it says not authed
            if (!whoami.ok || !(whoami.data as any).authed) {
                console.warn("[PulseRuntime] Auth Missing (WhoAmI) - Enforcing Sign In", whoami);
                setRuntimeMode('auth_missing');
                setIsLoading(false);
                return;
            }

            // 2. Fetch Home (now redundant for auth check, but good for preview mode)
            const stateParams = await safeFetchJSON('/api/runtime/home');

            if (stateParams.ok && (stateParams.data as any).mode === 'preview') {
                setRuntimeMode('preview');
                setLifeState((stateParams.data as any).lifeState || { energy: 'Medium', stress: 'Low', momentum: 'High', orientation: 'Preview Mode' });
                setIsLoading(false);
                return;
            }

            // 3. Parallel fetch of all runtime data
            // We TRUST whoami, so even if these 401, we know we are authed, so it's a glitch not a logout.
            const [ls, tr, nt, pl, obs] = await Promise.all([
                client.getLifeState(),
                client.getTrends(),
                client.getNotables(),
                client.getPlanLedger(),
                client.getObserverData()
            ]);

            setLifeState(ls);
            setTrends(tr);
            setNotables(nt);
            setPlanLedger(pl);
            setObserverData(obs);
            setRuntimeMode('live');

        } catch (err: any) {
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    }, [handleError]);

    // Initial Load
    useEffect(() => {
        refresh();
    }, [refresh]);

    const sendBridgeMessage = async (text: string) => {
        // If in preview, optimistic add only, or show banner?
        if (runtimeMode === 'preview') {
            setMessages(prev => [...prev, { id: uuidv4(), content: text, role: 'user', timestamp: new Date() }]);
            // Simulate reply
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: uuidv4(),
                    role: 'pulse',
                    content: "Preview Mode: Writes are disabled.",
                    timestamp: new Date()
                }]);
            }, 500);
            return;
        }

        // 1. Optimistic Add
        const tempId = uuidv4();
        const userMsg: Message = { id: tempId, content: text, role: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);

        // 2. Server Call
        try {
            const reply = await client.sendBridgeMessage(text);
            setMessages(prev => [...prev, reply]);
        } catch (err: any) {
            if (err?.status === 401 || err?.code === 'AUTH_MISSING') {
                setRuntimeMode('auth_missing');
                return;
            }
            setMessages(prev => [...prev, {
                id: uuidv4(),
                role: 'system',
                content: "Unable to reach Pulse Brain.",
                timestamp: new Date()
            }]);
            handleError(err);
        }
    };

    const value = {
        lifeState,
        trends,
        notables,
        planLedger,
        observerData,
        messages,
        sendBridgeMessage,
        isLoading,
        refresh,
        runtimeMode // Exposed for UI
    };

    return (
        <PulseRuntimeContext.Provider value={value}>
            {children}
            {runtimeMode === 'preview' && (
                <div className="fixed bottom-0 left-0 right-0 bg-indigo-900/90 text-indigo-100 text-xs px-4 py-1 text-center backdrop-blur-sm z-[9999]">
                    PREVIEW SAFE MODE — Read Only
                </div>
            )}
            {runtimeMode === 'auth_missing' && (
                // ✅ BYPASS: Do not show blocking modal on Auth Routes (sign-in, sign-up, etc)
                // This prevents the "500-like" conflict where the sign-in page is overlaid by this modal.
                typeof window !== 'undefined' &&
                    !window.location.pathname.startsWith('/sign-in') &&
                    !window.location.pathname.startsWith('/sign-up') &&
                    !window.location.pathname.startsWith('/welcome') // Welcome handles its own redirect
                    ? (
                        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center">
                            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-2xl max-w-md text-center">
                                <h2 className="text-xl font-bold text-white mb-2">Sign in to Pulse</h2>
                                <p className="text-neutral-400 mb-6">Your session has expired or you are not signed in.</p>
                                <a href="/sign-in" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-black bg-white hover:bg-neutral-200 transition-colors">
                                    Sign In
                                </a>

                                <div className="mt-6 pt-6 border-t border-neutral-800">
                                    <button
                                        onClick={async () => {
                                            // 1. Service Worker update check
                                            if ('serviceWorker' in navigator) {
                                                const regs = await navigator.serviceWorker.getRegistrations();
                                                for (const reg of regs) {
                                                    await reg.update();
                                                }
                                            }
                                            // 2. Clear Runtime Keys (if any - mostly relying on SW bypass now)
                                            // 3. Hard Reload
                                            window.location.reload();
                                        }}
                                        className="text-xs text-neutral-500 hover:text-neutral-300 underline transition-colors"
                                    >
                                        Reset Runtime Cache
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null
            )}
        </PulseRuntimeContext.Provider>
    );
}

export function usePulseRuntime() {
    const context = useContext(PulseRuntimeContext);
    if (context === undefined) {
        throw new Error('usePulseRuntime must be used within a PulseRuntimeProvider');
    }
    return context;
}

export function usePulseRuntimeOptional() {
    return useContext(PulseRuntimeContext);
}

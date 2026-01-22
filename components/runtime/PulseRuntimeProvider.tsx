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
// Helper for safe fetching
async function safeFetchJSON(url: string) {
    try {
        // ✅ FIX Phase 28-F: Auth Loop
        // We MUST send credentials (cookies) to the backend.
        // Default fetch does not send cookies for same-origin unless specified or standard.
        // Next.js/Browser defaults vary, explicit is safer.
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // <--- CRITICAL FIX
        });
        if (!res.ok) return { ok: false as const, status: res.status };
        const data = await res.json();
        return { ok: true as const, data };
    } catch (e) {
        return { ok: false as const, error: String(e) };
    }
}

import { usePathname } from "next/navigation";

// Helper to detect if we are on an auth route where the runtime loop must be inert.
function isAuthPath(pathname: string) {
    if (!pathname) return false;
    // Normalize pathname: lowercase and remove trailing slash
    let p = pathname.toLowerCase();
    if (p.endsWith("/") && p.length > 1) {
        p = p.slice(0, -1);
    }

    return (
        p === "/sign-in" ||
        p.startsWith("/sign-in/") ||
        p === "/sign-up" ||
        p.startsWith("/sign-up/") ||
        p === "/welcome" ||
        p.startsWith("/welcome/")
    );
}

export function PulseRuntimeProvider({ children }: { ReactNode }) {
    // 📢 PRESENCE SHELL PUBLISHER (v1)
    usePresencePublisher();
    usePresenceErrorCapture();

    const pathname = usePathname();
    const isAuth = isAuthPath(pathname || "");

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

    // FIX Phase 28-B: Hydration Mismatch
    // Do NOT use new Date() in initial state. Start empty, add in effect.
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [runtimeMode, setRuntimeMode] = useState<'live' | 'preview' | 'paused' | 'auth_missing'>('live');

    // FIX Phase 28-B: Debug Telemetry
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[PulseRuntime] Debug: Path=${pathname} IsAuth=${isAuth} Mode=${runtimeMode}`);
        }
    }, [pathname, isAuth, runtimeMode]);

    const handleError = useCallback((err: any) => {
        console.error("Runtime Provider Error:", err);
        // Fallback to paused safely instead of crash
        setRuntimeMode('paused');
    }, []);

    const refresh = useCallback(async () => {
        // ✅ EXIT EARLY if on auth route (never fetch)
        if (isAuth) return;

        setIsLoading(true);
        try {
            // 1. Check Truth Endpoint (WhoAmI)
            const whoami = await safeFetchJSON('/api/runtime/whoami');

            // STRICT CHECK: Only enforce "Auth Missing" if whoami explicitly says we are NOT authed.
            // If the fetch fails (ok: false), we might be offline or have a network error, so purely logging a warning is safer strictly speaking than locking them out,
            // but for security "fail closed" is standard. However, the recurring bug is logging "Auth Missing" when ok:true.
            const isAuthed = whoami.ok && (whoami.data as any).authed === true;

            if (!isAuthed) {
                console.warn("[PulseRuntime] Auth Missing (WhoAmI) - Enforcing Sign In", {
                    ok: whoami.ok,
                    status: (whoami as any).status,
                    authed: (whoami.data as any)?.authed
                });
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
    }, [handleError, isAuth]);

    // Initial Load & Hydration Safe Message
    useEffect(() => {
        // 1. Add initial message on client only (prevents hydration mismatch)
        setMessages(prev => {
            if (prev.length === 0) {
                return [{ id: 'init-1', content: "Good morning. Connecting to Pulse.", role: 'pulse', timestamp: new Date() }];
            }
            return prev;
        });

        // 2. Trigger Refresh logic
        if (!isAuth) {
            refresh();
        }
    }, [refresh, isAuth]);

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

    // ✅ HARD BYPASS: Inert on Auth Routes
    // FIX Phase 28-A: We MUST mount the Provider unconditionally to prevent React #418 hydration errors.
    // Instead of returning early, we provide an "Inert" (No-op) context.

    const inertValue: PulseRuntimeContextType = {
        lifeState: { energy: 'Medium', stress: 'Medium', momentum: 'Medium', orientation: "Auth..." },
        trends: {},
        notables: [],
        planLedger: [],
        observerData: { runtime: [], autonomy: [], effects: [], ipp: [], background: [] },
        messages: [],
        sendBridgeMessage: () => { },
        isLoading: false,
        refresh: async () => { },
        runtimeMode: 'paused'
    };

    const value = isAuth ? inertValue : {
        lifeState,
        trends,
        notables,
        planLedger,
        observerData,
        messages,
        sendBridgeMessage,
        isLoading,
        refresh,
        runtimeMode
    };

    return (
        <PulseRuntimeContext.Provider value={value}>
            {children}
            {!isAuth && runtimeMode === 'preview' && (
                <div className="fixed bottom-0 left-0 right-0 bg-indigo-900/90 text-indigo-100 text-xs px-4 py-1 text-center backdrop-blur-sm z-[9999]">
                    PREVIEW SAFE MODE — Read Only
                </div>
            )}
            {!isAuth && runtimeMode === 'auth_missing' && (
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

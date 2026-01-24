"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
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
import { useAuth } from "@clerk/nextjs";

import { usePathname, useRouter } from "next/navigation";

// Helper to detect if we are on an auth route where the runtime loop must be inert.
// ✅ Hydration Fix: Use window.location (always accurate) instead of usePathname (returns "/" initially)
const SKIP_RUNTIME_PATHS = ['/welcome', '/sign-in', '/sign-up', '/sign-out', '/onboarding'];

function isAuthPath(): boolean {
    // On client, use window.location (always accurate)
    // On server, be conservative and skip polling
    if (typeof window === 'undefined') {
        return true; // Server-side: don't poll
    }
    const actualPath = window.location.pathname;
    return SKIP_RUNTIME_PATHS.some(p => actualPath.startsWith(p));
}

export function PulseRuntimeProvider({ children }: { ReactNode }) {
    // 📢 PRESENCE SHELL PUBLISHER (v1)
    usePresencePublisher();
    usePresenceErrorCapture();

    const pathname = usePathname();
    const router = useRouter();
    const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
    const hasRedirected = useRef(false);

    // ✅ Hydration Guard: Track when client has hydrated to prevent pathname mismatch
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

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

    const [runtimeMode, setRuntimeMode] = useState<'live' | 'preview' | 'paused'>('live');

    // FIX Phase 28-B: Debug Telemetry
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[PulseRuntime] Debug: Path=${pathname} IsAuth=${isAuthPath()} Mode=${runtimeMode}`);
        }
    }, [pathname, runtimeMode]);

    const handleError = useCallback((err: any) => {
        console.error("Runtime Provider Error:", err);

        // ✅ Antigravity Phase 2: 401 Failsafe
        // If we get an explicit 401/AUTH_MISSING, handle gracefully.
        if (err?.status === 401 || err?.code === 'AUTH_MISSING') {
            console.warn("[PulseRuntime] 401 detected.");
            setRuntimeMode('paused');

            // ⚠️ Loop Prevention: Only redirect ONCE and only if NOT signed in with Clerk
            // If signed in with Clerk but getting 401s, it's a middleware/config issue
            // Don't redirect to avoid infinite loop
            if (clerkLoaded && !isSignedIn && !isAuthPath() && !hasRedirected.current) {
                console.warn("[PulseRuntime] Not signed in. Redirecting to /sign-in.");
                hasRedirected.current = true;
                router.replace('/sign-in'); // Use replace to avoid back button issues
            } else if (isSignedIn) {
                console.error("[PulseRuntime] Signed in but getting 401s. Middleware issue. Staying paused.");
            }
            return;
        }

        // Fallback to paused safely instead of crash
        setRuntimeMode('paused');
    }, [router, isSignedIn, clerkLoaded]);

    const refresh = useCallback(async () => {
        // Wait for hydration before doing anything (prevents pathname mismatch)
        if (!isHydrated) {
            console.log('[PulseRuntime] Waiting for hydration...');
            return;
        }

        // Skip runtime on auth/onboarding pages
        if (isAuthPath()) {
            console.log('[PulseRuntime] Skipping refresh - on auth/onboarding page:', typeof window !== 'undefined' ? window.location.pathname : pathname);
            return;
        }

        console.log('[PulseRuntime] Starting refresh on:', typeof window !== 'undefined' ? window.location.pathname : pathname);
        setIsLoading(true);
        try {
            // Preview detection only (NO AUTH CHECK)
            // ✅ Antigravity: Use unified runtime client with credentials: 'include'
            const stateParams = await client.runtimeFetchJSON('home');

            if (stateParams.ok && (stateParams.data as any).mode === 'preview') {
                setRuntimeMode('preview');
                setLifeState((stateParams.data as any).lifeState || {
                    energy: 'Medium',
                    stress: 'Low',
                    momentum: 'High',
                    orientation: 'Preview Mode'
                });
                return;
            }

            // Parallel runtime data fetch
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
    }, [handleError, isHydrated, pathname]);

    // Initial Load & Hydration Safe Message
    useEffect(() => {
        // 1. Add initial message on client only (prevents hydration mismatch)
        setMessages(prev => {
            if (prev.length === 0) {
                return [{ id: 'init-1', content: "Good morning. Connecting to Pulse.", role: 'pulse', timestamp: new Date() }];
            }
            return prev;
        });

        // 2. Trigger Refresh logic (only after hydration)
        if (!isHydrated) return;
        if (isAuthPath()) return;

        refresh();
    }, [refresh, isHydrated]);

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

    const value = isAuthPath() ? inertValue : {
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
            {!isAuthPath() && runtimeMode === 'preview' && (
                <div className="fixed bottom-0 left-0 right-0 bg-indigo-900/90 text-indigo-100 text-xs px-4 py-1 text-center backdrop-blur-sm z-[9999]">
                    PREVIEW SAFE MODE — Read Only
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

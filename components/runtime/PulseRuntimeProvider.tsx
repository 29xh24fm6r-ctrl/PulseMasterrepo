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

export function PulseRuntimeProvider({ children }: { children: ReactNode }) {
    const { setIPPActive } = useOverlays();

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

    const handleError = useCallback((err: any) => {
        console.error("Runtime Provider Error:", err);
        // Map simplified error codes to IPP or Banner

        // 1. Subscription Limits (Banner)
        if (err?.code === 'LIMIT_REACHED') {
            setBannerActive(true, "You’ve reached today’s limit. Upgrade for unlimited access.");
            return; // STOP here, do not trigger IPP
        }

        // 2. Feature Gates (Banner)
        if (err?.message?.includes("requires Plus") || err?.code === 'FEATURE_LOCKED') {
            setBannerActive(true, "This feature requires Pulse Plus.");
            return;
        }

        // 3. Auth/Network Critical Failures (IPP)
        if (err?.code === 'AUTH_MISSING' || err?.code === 'FORBIDDEN') {
            // Note: If FORBIDDEN is used for capability gating, it might be caught above if message differs.
            // But generic 403 usually implies Auth issue if not LIMIT_REACHED.
            setIPPActive(true);
        } else if (err?.code === 'NETWORK_ERROR' || err?.code === 'SERVER_ERROR') {
            setIPPActive(true);
        }
    }, [setIPPActive, setBannerActive]);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            // Parallel fetch all runtime data
            // We use the client helper which handles fallback logic if enabled
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
        // 1. Optimistic Add
        const tempId = uuidv4();
        const userMsg: Message = { id: tempId, content: text, role: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);

        // 2. Server Call
        try {
            const reply = await client.sendBridgeMessage(text);
            setMessages(prev => [...prev, reply]);
        } catch (err: any) {
            // Rollback or Error Message
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
        refresh
    };

    return (
        <PulseRuntimeContext.Provider value={value}>
            {children}
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

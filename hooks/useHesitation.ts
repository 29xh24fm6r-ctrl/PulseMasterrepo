import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { EngagementState, HesitationSignal, TelemetryPacket } from './hesitation-types';

// Configuration constants
const TELEMETRY_TICK_MS = 250;
const INFERENCE_TICK_MS = 2000;
const DWELL_THRESHOLD_STUCK = 8000; // ms
const REVISIT_THRESHOLD_AVOIDANCE = 3;

interface HesitationContextType {
    telemetry: TelemetryPacket;
    signal: HesitationSignal;
    registerInteraction: (targetId: string, type: 'hover' | 'click' | 'leave') => void;
}

const HesitationContext = createContext<HesitationContextType | null>(null);

export const useHesitationContext = () => {
    const context = useContext(HesitationContext);
    if (!context) throw new Error('useHesitationContext must be used within a HesitationProvider');
    return context;
};

interface HesitationProviderProps {
    children: ReactNode;
}

export function HesitationProvider({ children }: HesitationProviderProps) {
    // Telemetry State (Channel A)
    const [telemetry, setTelemetry] = useState<TelemetryPacket>({
        targetId: null,
        dwellMs: 0,
        hoverCount: 0,
        revisitCount: 0,
        scrollVelocity: 0,
        timestamp: Date.now()
    });

    // Inference State (Channel B)
    const [signal, setSignal] = useState<HesitationSignal>({
        hesitationScore: 0,
        avoidanceScore: 0,
        state: 'BROWSING',
        primaryTargetId: null
    });

    // Rolling buffers for inference
    const scrollSamples = useRef<number[]>([]);
    const lastInteractionTime = useRef<number>(Date.now());
    const focusSwitchCount = useRef<number>(0);

    // -- Channel A: Telemetry Collection --

    // Track scroll velocity
    useEffect(() => {
        let lastScrollY = window.scrollY;
        let lastScrollTime = Date.now();

        const handleScroll = () => {
            const now = Date.now();
            const deltaY = Math.abs(window.scrollY - lastScrollY);
            const deltaTime = now - lastScrollTime;

            if (deltaTime > 50) { // Throttle scroll sampling
                const velocity = deltaY / deltaTime; // px/ms
                scrollSamples.current.push(velocity);
                if (scrollSamples.current.length > 20) scrollSamples.current.shift();

                setTelemetry(prev => ({ ...prev, scrollVelocity: velocity, timestamp: now }));

                lastScrollY = window.scrollY;
                lastScrollTime = now;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Track Focus Switching (Tab blur/focus)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                focusSwitchCount.current += 1;
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);


    // -- Channel B: Inference Engine --

    const computeSignal = useCallback(() => {
        const now = Date.now();
        const timeSinceInteraction = now - lastInteractionTime.current;

        // Calculate metric components
        const avgScrollVelocity = scrollSamples.current.reduce((a, b) => a + b, 0) / (scrollSamples.current.length || 1);

        // Core Scoring Logic (as per spec)

        // Dwell Component
        const dwellComponent = Math.min(telemetry.dwellMs / DWELL_THRESHOLD_STUCK, 1);

        // Revisit Component
        const revisitComponent = Math.min(telemetry.revisitCount / 6, 1);

        // Focus Switch Component
        const focusComponent = Math.min(focusSwitchCount.current / 5, 1);

        // Calculate Scores
        const hesitationScore = (0.55 * dwellComponent) + (0.35 * revisitComponent) + (0.10 * focusComponent);

        // Avoidance Score: High revisit but abandonment
        const avoidanceScore = (telemetry.revisitCount > REVISIT_THRESHOLD_AVOIDANCE && telemetry.dwellMs < 2000) ? 0.8 : 0;

        // Determine State
        let state: EngagementState = 'BROWSING';

        if (avgScrollVelocity > 2 && focusSwitchCount.current > 3) {
            state = 'OVERWHELMED';
        } else if (avoidanceScore > 0.6) {
            state = 'AVOIDING';
        } else if (hesitationScore > 0.7) {
            state = 'STUCK';
        } else if (avgScrollVelocity < 0.5 && timeSinceInteraction < 3000) {
            state = 'FLOW';
        }

        setSignal({
            hesitationScore,
            avoidanceScore,
            state,
            primaryTargetId: telemetry.targetId
        });

    }, [telemetry]);

    // Run Inference Loop
    useEffect(() => {
        const interval = setInterval(computeSignal, INFERENCE_TICK_MS);
        return () => clearInterval(interval);
    }, [computeSignal]);

    const registerInteraction = useCallback((targetId: string, type: 'hover' | 'click' | 'leave') => {
        lastInteractionTime.current = Date.now();

        setTelemetry(prev => {
            const isSameTarget = prev.targetId === targetId;

            if (type === 'hover') {
                return {
                    ...prev,
                    targetId,
                    hoverCount: isSameTarget ? prev.hoverCount : prev.hoverCount + 1,
                    revisitCount: isSameTarget ? prev.revisitCount : prev.revisitCount + 1
                };
            }

            // Reset dwell logic if leaving target would go here in full implementation
            return prev;
        });
    }, []);

    return (
        <HesitationContext.Provider value= {{ telemetry, signal, registerInteraction }
}>
    { children }
    </HesitationContext.Provider>
  );
}

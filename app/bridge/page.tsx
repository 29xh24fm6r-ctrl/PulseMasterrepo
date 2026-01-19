"use client";

export const dynamic = "force-dynamic";


import React from 'react';
import BridgeLayout from '@/components/bridge/BridgeLayout';
import CenterStage from '@/components/bridge/CenterStage';
import NowDisplay from '@/components/bridge/NowDisplay';
import { useNowEngine } from '@/lib/hooks/useNowEngine';
import { useGlobalKeybindings } from '@/lib/hooks/useGlobalKeybindings';
import { RecommendedAction } from '@/lib/now-engine/types';
import { logNowEvent } from '@/lib/now-engine/telemetry';
import { DevSmokePanel } from '@/components/bridge/DevSmokePanel';
import { resolveInabilityToProceed } from '@/lib/brain/inability/resolve';
import InabilityToProceedCard from '@/components/system/InabilityToProceedCard';
import { handleInabilityAction } from '@/lib/brain/inability/actions';
import { pushEvent } from '@/lib/observer/store';
import { useEffect, useState } from 'react';
import { speak } from '@/lib/voice/speechAuthority';

export default function BridgePage() {
    // Phase 17.3: Inability-to-Proceed Protocol (IPP)
    // We must resolve this deterministically before rendering ANY content.
    // Note: We use state/effect to ensure we access localStorage on client only.
    const [inability, setInability] = useState<any>(null);

    useEffect(() => {
        const check = resolveInabilityToProceed({
            hasOwnerId: typeof window !== 'undefined' && Boolean(localStorage.getItem('pulse_owner_user_id')),
            networkOk: typeof navigator !== 'undefined' ? navigator.onLine : true,
            permissionOk: true // Future: check caps
        });
        setInability(check);

        if (check) {
            pushEvent({
                type: 'inability',
                route: '/bridge',
                reason: check.reason,
                message: check.explanation,
                confidence: check.confidence,
                resolved: false
            });

            // Voice Enforcement
            if (check.confidence === 'high') {
                speak(check.explanation);
            }
        }
    }, []);

    const result = useNowEngine();

    if (inability) {
        return (
            <InabilityToProceedCard
                inability={inability}
                onAction={handleInabilityAction}
            />
        );
    }

    // Handlers
    const executeAction = async (action: RecommendedAction) => {
        // Optimistic UI could happen here
        try {
            await fetch('/api/pulse/now/actions', {
                method: 'POST',
                body: JSON.stringify({ type: 'EXECUTE', payload: action.payload })
            });

            // Phase J: Telemetry (now_action_taken)
            logNowEvent({
                event: "now_action_taken",
                action_id: action.action_type, // or label if ID missing, types.ts says label/action_type
                intent: action.action_type,
                source: "primary",
                timestamp: Date.now()
            });

            // Reload engine state
            window.location.reload(); // Simple refresh for V1, or trigger re-fetch in hook
        } catch (e) {
            alert("Failed to execute action");
        }
    };

    const deferNow = async () => {
        try {
            // Payload could track what was deferred
            await fetch('/api/pulse/now/actions', {
                method: 'POST',
                body: JSON.stringify({ type: 'DEFER', payload: { last_focus_candidate: result.status === 'resolved_now' ? result.primary_focus : null } })
            });

            logNowEvent({
                event: "now_action_taken",
                action_id: "defer",
                intent: "defer",
                source: "secondary",
                timestamp: Date.now()
            });
            window.location.reload();
        } catch (e) {
            console.error(e);
        }
    };

    const recomputeNow = () => {
        console.log('RECOMPUTING NOW');
        // In real app: call API to recompute
        // For mock: result._debugForceState('resolved');
        if ('_debugForceState' in result) {
            (result as any)._debugForceState('resolved');
        }
    };

    // Global Keybindings
    useGlobalKeybindings({
        'Enter': (e) => {
            // Prevent default if it's the global action
            // Note: Native button clicks handle their own enter if focused, 
            // but we want a "Global Enter" if focus is neutral.
            if (result.status === 'resolved_now') {
                e.preventDefault();
                executeAction(result.recommended_action);
            }
        },
        'Escape': (e) => {
            if (result.status === 'resolved_now') {
                e.preventDefault();
                deferNow();
            }
        }
    });

    return (
        <BridgeLayout>
            <CenterStage>
                <NowDisplay
                    result={result}
                    onExecute={executeAction}
                    onDefer={deferNow}
                    onOverride={recomputeNow}
                />
            </CenterStage>

            {/* SatelliteControls (Placeholder) */}
            <div className="fixed bottom-0 left-0 p-4 opacity-50 hover:opacity-100 transition-opacity">
                <div className="text-xs text-slate-600 font-mono">
                    DEBUG:
                    <button className="mx-2 hover:text-white" onClick={() => (result as any)._debugForceState('resolved')}>Resolved</button>
                    <button className="mx-2 hover:text-white" onClick={() => (result as any)._debugForceState('ambiguous')}>Ambiguous</button>
                    <button className="mx-2 hover:text-white" onClick={() => (result as any)._debugForceState('deferred')}>Deferred</button>
                </div>
            </div>

            <DevSmokePanel />
        </BridgeLayout>
    );
}

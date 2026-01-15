"use client";

import React from 'react';
import BridgeLayout from '@/components/bridge/BridgeLayout';
import CenterStage from '@/components/bridge/CenterStage';
import NowDisplay from '@/components/bridge/NowDisplay';
import { useNowEngine } from '@/lib/hooks/useNowEngine';
import { useGlobalKeybindings } from '@/lib/hooks/useGlobalKeybindings';
import { RecommendedAction } from '@/lib/now-engine/types';

export default function BridgePage() {
    const result = useNowEngine();

    // Handlers
    const executeAction = async (action: RecommendedAction) => {
        // Optimistic UI could happen here
        try {
            await fetch('/api/pulse/now/actions', {
                method: 'POST',
                body: JSON.stringify({ type: 'EXECUTE', payload: action.payload })
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
        </BridgeLayout>
    );
}

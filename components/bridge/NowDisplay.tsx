import React from 'react';
import { NowResult, RecommendedAction } from '@/lib/now-engine/types';
import ResolvedNow from './states/ResolvedNow';
import NoClearNow from './states/NoClearNow';
import DeferredNow from './states/DeferredNow';

import AuthMissing from './states/AuthMissing';
import FetchError from './states/FetchError';
import { logNowEvent } from '@/lib/now-engine/telemetry';

interface NowDisplayProps {
    result: NowResult;
    onExecute: (action: RecommendedAction) => void;
    onDefer: () => void;
    onOverride: () => void;
}

// Guards
function assertResolved(
    r: any
): asserts r is Extract<NowResult, { status: "resolved_now" }> {
    if (!r.primary_focus || !r.recommended_action) {
        throw new Error("Invalid resolved_now payload");
    }
}

function assertNoClear(
    r: any
): asserts r is Extract<NowResult, { status: "no_clear_now" }> {
    if (!r.explanation) {
        throw new Error("Invalid no_clear_now payload");
    }
}

function assertDeferred(
    r: any
): asserts r is Extract<NowResult, { status: "deferred" }> {
    if (!r.cooldown_until) {
        throw new Error("Invalid deferred payload");
    }
}

function assertAuthMissing(
    r: any
): asserts r is Extract<NowResult, { status: "auth_missing" }> {
    if (!r.message) throw new Error("Invalid auth_missing payload");
}

function assertFetchError(
    r: any
): asserts r is Extract<NowResult, { status: "fetch_error" }> {
    if (!r.message) throw new Error("Invalid fetch_error payload");
}

import { useFirstRun } from '@/lib/hooks/useFirstRun';
import BridgeFirstRun from './states/BridgeFirstRun';

export default function NowDisplay(props: NowDisplayProps) {
    const { result } = props;
    const { isFirstRun, isLoaded, markSeen } = useFirstRun();

    // Phase J: Telemetry (now_presented)
    React.useEffect(() => {
        if (result?.status) {
            logNowEvent({
                event: "now_presented",
                now_status: result.status,
                ui_state: result.status, // Granular state if needed
                timestamp: Date.now()
            });
        }
    }, [result?.status]);

    // Handling First Run Overlay
    // We only show this if loaded to avoid hydration mismatch, 
    // and if auth/fetch are NOT erroring (we want errors to take precedence or at least show first?)
    // Actually spec says "First-run UI takes precedence" over NoClear/Deferred, 
    // but Phase F says "Fail Loudly". 
    // IF result.status is auth_missing, we MUST show AuthMissing.
    // IF result.status is fetch_error, we probably should show that too.
    // SO: Only show FirstRun if status is NOT error.

    const isErrorState = result?.status === 'auth_missing' || result?.status === 'fetch_error';

    if (isLoaded && isFirstRun) {
        return <BridgeFirstRun onExit={(intent) => {
            console.log("Onboarding Intent:", intent);
            markSeen();
            // In a future iter, we would preload the input with `intent`
        }} />;
    }

    if (!result || !result.status) {
        // Emergency fallback if result is malformed
        return (
            <NoClearNow
                {...props}
                result={{
                    status: "no_clear_now",
                    explanation: "System State Unavailable. Recompute generally required.",
                    fallback_action: undefined,
                }}
            />
        );
    }

    switch (result.status) {
        case "auth_missing":
            try {
                assertAuthMissing(result);
                return <AuthMissing result={result} />;
            } catch (e) { console.error(e); break; }

        case "fetch_error":
            try {
                assertFetchError(result);
                return <FetchError result={result} />;
            } catch (e) { console.error(e); break; }

        case "resolved_now":
            try {
                assertResolved(result);
                return <ResolvedNow {...props} result={result} />;
            } catch (e) { console.error(e); break; }

        case "no_clear_now":
            try {
                assertNoClear(result);
                return <NoClearNow {...props} result={result} />;
            } catch (e) { console.error(e); break; }

        case "deferred":
            try {
                assertDeferred(result);
                return <DeferredNow {...props} result={result} />;
            } catch (e) { console.error(e); break; }

        default:
            break;
    }

    // Spec-mandated fallback for any fall-through
    return (
        <NoClearNow
            {...props}
            result={{
                status: "no_clear_now",
                explanation: "State unavailable. Recompute?",
                fallback_action: undefined,
            }}
        />
    );
}

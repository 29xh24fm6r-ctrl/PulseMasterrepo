import React from 'react';
import { NowResult, RecommendedAction } from '@/lib/now-engine/types';
import ResolvedNow from './states/ResolvedNow';
import NoClearNow from './states/NoClearNow';
import DeferredNow from './states/DeferredNow';

import AuthMissing from './states/AuthMissing';
import FetchError from './states/FetchError';

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

export default function NowDisplay(props: NowDisplayProps) {
    const { result } = props;

    // Defensive try-catch or safe render logic can be added, 
    // but strictly switching on status ensures mutual exclusivity.

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

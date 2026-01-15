import React from 'react';
import { NowResult, RecommendedAction } from '@/lib/now-engine/types';
import {
    NowCard,
    IdentityBadge,
    PrimaryFocusTitle,
    ReasonStack,
    ActionButton,
    SecondaryActions,
    SecondaryButton,
    TertiaryButton
} from '../atoms';

import { FuturesList } from '../FuturesList';
import { logNowEvent } from '@/lib/now-engine/telemetry';

export default function ResolvedNow({
    result,
    onExecute,
    onDefer,
    onOverride,
}: {
    result: Extract<NowResult, { status: "resolved_now" }>;
    onExecute: (a: RecommendedAction) => void;
    onDefer: () => void;
    onOverride: () => void;
}) {
    // Phase L: Local Promotion State
    // We initialize with the prop, but allow local override
    const [activeFocus, setActiveFocus] = React.useState(result.primary_focus);

    // Sync if prop changes (e.g. re-fetch)
    React.useEffect(() => {
        setActiveFocus(result.primary_focus);
    }, [result.primary_focus]);

    const handlePromote = (f: import('@/lib/now-engine/types').NowFuture) => {
        if (f.original_candidate) {
            setActiveFocus(f.original_candidate);

            // Log Telemetry (Phase J integration)
            logNowEvent({
                event: "now_action_taken",
                action_id: f.id,
                intent: "promote_future",
                source: "secondary",
                timestamp: Date.now()
            });
        }
    };

    const { primary_focus } = { primary_focus: activeFocus }; // Destructure alias
    const supporting_reasons = activeFocus.reasons;
    const recommended_action = activeFocus.recommended_action;
    const confidence_score = activeFocus.confidence; // Use candidate confidence, not result score (which was for top)

    // Valid futures are those that are NOT the active focus
    const visibleFutures = result.futures?.filter(f => f.id !== activeFocus.ref_id).slice(0, 3);

    return (
        <NowCard>
            <div className="flex flex-col items-center">
                <IdentityBadge tags={primary_focus.context_tags} />
                <div className="mt-1">
                    {confidence_score >= 0.75 && <span className="text-xs font-mono text-emerald-400">High Confidence</span>}
                    {confidence_score >= 0.45 && confidence_score < 0.75 && <span className="text-xs font-mono text-amber-400">Medium Confidence</span>}
                    {confidence_score < 0.45 && <span className="text-xs font-mono text-slate-400">Low Confidence</span>}
                </div>
            </div>

            <PrimaryFocusTitle>
                {primary_focus.title}
            </PrimaryFocusTitle>

            <details className="w-full text-center group cursor-pointer">
                <summary className="text-xs text-slate-500 hover:text-slate-300 transition-colors list-none select-none">
                    <span className="group-open:hidden">Why?</span>
                    <span className="hidden group-open:inline">Drivers</span>
                </summary>
                <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                    <ReasonStack reasons={supporting_reasons} />
                </div>
            </details>

            <ActionButton
                label={recommended_action.label}
                onClick={() => onExecute(recommended_action)}
                hotkey="Enter"
                primary
            />

            <SecondaryActions>
                <SecondaryButton onClick={onDefer}>Not now</SecondaryButton>
                <TertiaryButton onClick={onOverride}>Recompute</TertiaryButton>
            </SecondaryActions>

            <FuturesList futures={visibleFutures} onPromote={handlePromote} />
        </NowCard>
    );
}

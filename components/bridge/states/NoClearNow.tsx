import React from 'react';
import { NowResult, RecommendedAction } from '@/lib/now-engine/types';
import { AmbiguityState, StatusText, IntentInput, SecondaryButton } from '../atoms';

export default function NoClearNow({
    result,
    onExecute,
}: {
    result: Extract<NowResult, { status: "no_clear_now" }>;
    onExecute: (a: RecommendedAction) => void;
}) {
    return (
        <AmbiguityState>
            <StatusText>{result.explanation}</StatusText>

            <IntentInput
                autoFocus
                placeholder="What is your intent?"
            />

            {result.fallback_action && (
                <SecondaryButton
                    onClick={() => onExecute(result.fallback_action!)}
                >
                    {result.fallback_action.label}
                </SecondaryButton>
            )}
        </AmbiguityState>
    );
}

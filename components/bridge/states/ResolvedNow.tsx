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
    const { primary_focus, supporting_reasons, recommended_action } = result;

    return (
        <NowCard>
            <IdentityBadge tags={primary_focus.context_tags} />

            <PrimaryFocusTitle>
                {primary_focus.title}
            </PrimaryFocusTitle>

            <ReasonStack reasons={supporting_reasons} />

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
        </NowCard>
    );
}

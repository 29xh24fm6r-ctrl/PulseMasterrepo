import React from 'react';
import { NowResult } from '@/lib/now-engine/types';
import { DeferredState, CooldownIndicator, SecondaryButton } from '../atoms';

export default function DeferredNow({
    result,
    onOverride,
}: {
    result: Extract<NowResult, { status: "deferred" }>;
    onOverride: () => void;
}) {
    return (
        <DeferredState>
            <CooldownIndicator until={result.cooldown_until} />

            <SecondaryButton onClick={onOverride}>
                Wake
            </SecondaryButton>
        </DeferredState>
    );
}

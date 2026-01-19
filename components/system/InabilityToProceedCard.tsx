import React, { useEffect, useState } from 'react';
import { InabilityToProceed, InabilityAction } from '@/lib/brain/inability/types';
import { pushEvent } from '@/lib/observer/store';

type Props = {
    inability: InabilityToProceed;
    onAction: (action: InabilityAction) => void;
};

export default function InabilityToProceedCard({ inability, onAction }: Props) {
    const { explanation, suggestedAction } = inability;
    const [inputs, setInputs] = useState(0);

    const handleInteraction = () => {
        const next = inputs + 1;
        setInputs(next);
        if (next === 6) {
            pushEvent({
                type: 'inability',
                route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
                message: 'Confusion Loop Detected',
                reason: inability.reason,
                meta: { pattern: 'confusion_loop', inputs: next }
            });
        }
    };

    return (
        <div
            onClick={handleInteraction}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                width: '100vw',
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: '#000000', // Assuming dark mode default or system bg
                color: '#ffffff',
                fontFamily: 'sans-serif',
            }}
        >
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 600 }}>
                I can’t continue yet
            </h1>

            <p style={{ fontSize: '1.25rem', marginBottom: '2rem', maxWidth: '600px', lineHeight: 1.5, opacity: 0.9 }}>
                {explanation}
            </p>

            {suggestedAction && (
                <button
                    onClick={() => onAction(suggestedAction.action)}
                    style={{
                        padding: '12px 24px',
                        fontSize: '1rem',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'opacity 0.2s',
                    }}
                >
                    {suggestedAction.label}
                </button>
            )}
        </div>
    );
}

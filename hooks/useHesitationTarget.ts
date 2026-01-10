import { useCallback, useEffect, useRef } from 'react';
import { useHesitationContext } from './useHesitation';

export function useHesitationTarget(targetId: string) {
    const { registerInteraction } = useHesitationContext();
    const startTimeRef = useRef<number | null>(null);
    const hoverCountRef = useRef(0);

    const handleMouseEnter = useCallback(() => {
        startTimeRef.current = Date.now();
        hoverCountRef.current += 1;
        registerInteraction(targetId, 'hover');
    }, [targetId, registerInteraction]);

    const handleMouseLeave = useCallback(() => {
        if (startTimeRef.current) {
            const dwellTime = Date.now() - startTimeRef.current;

            // If significant interaction, report to Gravity Engine
            if (dwellTime > 2000) {
                // Fire and forget - don't block UI
                fetch('/api/gravity/avoid', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetId,
                        dwellMs: dwellTime,
                        revisitCount: hoverCountRef.current
                    })
                }).catch(err => console.error('Gravity Signal Failed:', err));
            }

            startTimeRef.current = null;
        }
        registerInteraction(targetId, 'leave');
    }, [targetId, registerInteraction]);

    const handleClick = useCallback(() => {
        registerInteraction(targetId, 'click');
    }, [targetId, registerInteraction]);

    return {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onClick: handleClick,
        'data-hesitation-target': targetId
    };
}

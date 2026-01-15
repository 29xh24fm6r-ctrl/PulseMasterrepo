import { useEffect } from 'react';

type KeyBindingMap = Record<string, (e: KeyboardEvent) => void>;

export function useGlobalKeybindings(bindings: KeyBindingMap) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input is focused, unless it's a special key like Escape provided we decide to handle it
            // For now, let's just run the binding if it exists
            const tagName = (e.target as HTMLElement).tagName;
            if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    e.currentTarget?.dispatchEvent(new Event('blur')); // simple blur
                }
                if (e.key === 'Enter') {
                    // let specific input handlers verify, but general global bindings might be skipped
                    // typically we want global bindings to work unless overridden
                }
                // For Bridge V1, we might want to respect focused inputs for 'Status Bar' typing,
                // but allow 'Escape' to defer.
                // Let's implement simple check: if handler matches key, run it.
            }

            const handler = bindings[e.key];
            if (handler) {
                handler(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [bindings]);
}
